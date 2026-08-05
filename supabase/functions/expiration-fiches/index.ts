/**
 * Fonction serveur « expiration-fiches ».
 *
 * CE QU'ELLE FAIT
 *   Une fois par semaine, elle retire du site les offres publiées dont la
 *   dernière confirmation remonte à plus de 60 jours, et rend la liste des
 *   créateurs à rappeler.
 *
 * POURQUOI
 *   Un catalogue vieillit tout seul. Un créateur arrête un modèle, change de
 *   prix, ferme son atelier — et personne ne prévient. Un visiteur qui
 *   contacte quelqu'un pour un objet disparu ne revient pas, et il le raconte.
 *   Mieux vaut vingt fiches vraies que soixante dont la moitié ment.
 *
 * RIEN N'EST SUPPRIMÉ
 *   Les offres repassent en brouillon : invisibles du public, intactes en
 *   base, republiables d'un clic depuis le back-office après vérification.
 *
 * POURQUOI ELLE PEUT MODIFIER « status »
 *   Un déclencheur de la base empêche normalement de toucher à cette colonne
 *   depuis l'application. Il laisse passer la clé de service, dont dispose
 *   cette fonction : c'est prévu, et c'est écrit dans migrations/0006.
 *
 * DÉPLOIEMENT ET PLANIFICATION : voir supabase/README.md
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!
const CLE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const CLE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Au-delà de ce délai sans confirmation, une fiche n'est plus digne de foi. */
const JOURS = 60

const enTetes = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), { status: statut, headers: enTetes })
}

interface OffrePerimee {
  id: string
  slug: string
  title: string
  last_confirmed_at: string
  vendor_display_name: string | null
  vendors: { display_name: string; contact_name: string | null; whatsapp_number: string } | null
}

Deno.serve(async (requete) => {
  if (requete.method === 'OPTIONS') return new Response('ok', { headers: enTetes })

  try {
    const service = createClient(URL_SUPABASE, CLE_SERVICE, { auth: { persistSession: false } })

    // --- Qui a le droit de déclencher ? -------------------------------------
    // Deux appelants légitimes, et deux seulement :
    //   - la tâche planifiée, qui présente la clé de service ;
    //   - vous, depuis le back-office, pour vérifier sans attendre.
    const autorisation = requete.headers.get('Authorization') ?? ''
    const jeton = autorisation.replace(/^Bearer\s+/i, '').trim()

    let autorise = jeton === CLE_SERVICE

    if (!autorise && jeton) {
      const appelant = createClient(URL_SUPABASE, CLE_ANON, {
        global: { headers: { Authorization: autorisation } },
      })
      const {
        data: { user },
      } = await appelant.auth.getUser()

      if (user) {
        const { data: role } = await service
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle()
        autorise = Boolean(role)
      }
    }

    if (!autorise) return reponse({ erreur: 'Non autorisé.' }, 403)

    // --- Mode simulation ----------------------------------------------------
    // Permet de voir ce qui disparaîtrait, sans rien changer. À utiliser la
    // première fois : dépublier vingt fiches par surprise ferait mal.
    const corps = await requete.json().catch(() => ({}))
    const simulation = corps?.simulation === true

    const limite = new Date(Date.now() - JOURS * 86_400_000).toISOString()

    const { data, error } = await service
      .from('offers')
      .select(
        'id, slug, title, last_confirmed_at, vendor_display_name, ' +
          'vendors(display_name, contact_name, whatsapp_number)',
      )
      .eq('status', 'published')
      .lt('last_confirmed_at', limite)
      .order('last_confirmed_at')

    if (error) throw error
    const perimees = (data ?? []) as unknown as OffrePerimee[]

    const detail = perimees.map((o) => ({
      slug: o.slug,
      titre: o.title,
      createur: o.vendor_display_name,
      jours: Math.floor((Date.now() - new Date(o.last_confirmed_at).getTime()) / 86_400_000),
    }))

    // Regroupé par créateur : c'est ainsi qu'on rappelle les gens, pas fiche
    // par fiche. Un seul message WhatsApp pour ses six offres.
    const parCreateur = new Map<
      string,
      { nom: string; contact: string | null; whatsapp: string; offres: string[] }
    >()

    for (const o of perimees) {
      const v = o.vendors
      if (!v) continue
      const cle = v.whatsapp_number
      const existant = parCreateur.get(cle) ?? {
        nom: v.display_name,
        contact: v.contact_name,
        whatsapp: v.whatsapp_number,
        offres: [],
      }
      existant.offres.push(o.title)
      parCreateur.set(cle, existant)
    }

    if (!simulation && perimees.length > 0) {
      const { error: erreurMaj } = await service
        .from('offers')
        .update({ status: 'draft' })
        .in(
          'id',
          perimees.map((o) => o.id),
        )
      if (erreurMaj) throw erreurMaj
    }

    return reponse({
      simulation,
      seuil_jours: JOURS,
      concernees: perimees.length,
      depubliees: simulation ? 0 : perimees.length,
      offres: detail,
      createurs_a_rappeler: [...parCreateur.values()],
      message: simulation
        ? `${perimees.length} fiche(s) seraient dépubliées. Rien n'a été modifié.`
        : perimees.length === 0
          ? 'Aucune fiche périmée. Le catalogue est à jour.'
          : `${perimees.length} fiche(s) repassées en brouillon.`,
    })
  } catch (e) {
    return reponse({ erreur: (e as Error).message }, 500)
  }
})
