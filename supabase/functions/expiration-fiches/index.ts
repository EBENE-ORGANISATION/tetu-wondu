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

/**
 * Le seuil de 60 jours n'est PAS écrit ici.
 *
 * Il vit dans la base, en valeur par défaut des fonctions fiches_perimees()
 * et expirer_fiches() — voir migrations/0010. La tâche hebdomadaire les
 * appelle directement ; cette fonction serveur aussi. Une seule définition,
 * donc aucun risque que les deux divergent le jour où l'on change le délai.
 */

const enTetes = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), { status: statut, headers: enTetes })
}

interface OffrePerimee {
  offer_id: string
  slug: string
  title: string
  vendor_display_name: string | null
  vendor_id: string
  contact_name: string | null
  whatsapp_number: string
  jours_ecoules: number
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

    // La liste vient de la base, avec son propre seuil. Cette fonction ne
    // décide de rien : elle rapporte et déclenche.
    const { data, error } = await service.rpc('fiches_perimees')
    if (error) throw error
    const perimees = (data ?? []) as OffrePerimee[]

    const detail = perimees.map((o) => ({
      slug: o.slug,
      titre: o.title,
      createur: o.vendor_display_name,
      jours: o.jours_ecoules,
    }))

    // Regroupé par créateur : c'est ainsi qu'on rappelle les gens, pas fiche
    // par fiche. Un seul message WhatsApp pour ses six offres.
    const parCreateur = new Map<
      string,
      { nom: string; contact: string | null; whatsapp: string; offres: string[] }
    >()

    for (const o of perimees) {
      const cle = o.whatsapp_number
      const existant = parCreateur.get(cle) ?? {
        nom: o.vendor_display_name ?? '(créateur inconnu)',
        contact: o.contact_name,
        whatsapp: o.whatsapp_number,
        offres: [],
      }
      existant.offres.push(o.title)
      parCreateur.set(cle, existant)
    }

    let depubliees = 0
    if (!simulation && perimees.length > 0) {
      // La dépublication elle-même est faite par la base, exactement comme
      // lors du passage hebdomadaire. Même code, mêmes règles.
      const { data: nombre, error: erreurMaj } = await service.rpc('expirer_fiches')
      if (erreurMaj) throw erreurMaj
      depubliees = (nombre as number) ?? 0
    }

    return reponse({
      simulation,
      concernees: perimees.length,
      depubliees,
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
