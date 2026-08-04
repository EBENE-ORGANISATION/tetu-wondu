/**
 * Fonction serveur « administrateurs ».
 *
 * POURQUOI ELLE EXISTE
 *   Créer un compte utilisateur exige la clé « service_role », qui contourne
 *   toutes les règles de sécurité de la base. Cette clé ne doit JAMAIS partir
 *   dans un navigateur : tout ce qu'on envoie au navigateur est lisible par
 *   n'importe qui. Elle ne peut donc vivre que côté serveur — ici. Supabase la
 *   fournit automatiquement, elle n'apparaît nulle part dans le code.
 *
 * CE QU'ELLE FAIT
 *   - lister    : qui est administrateur, avec son adresse e-mail
 *   - inviter   : envoyer une invitation et accorder le rôle
 *   - revoquer  : retirer le rôle (sans supprimer le compte)
 *
 * LA RÈGLE DE SÉCURITÉ
 *   Chaque appel vérifie d'abord que le demandeur est lui-même administrateur.
 *   Sans ce contrôle, cette fonction serait une porte ouverte : n'importe qui
 *   disposant de la clé publique pourrait se nommer administrateur.
 *
 * DÉPLOIEMENT
 *   Supabase → Edge Functions → Deploy a new function → nom « administrateurs »
 *   → coller ce fichier. Aucune variable à configurer.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!
const CLE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const CLE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const enTetes = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), { status: statut, headers: enTetes })
}

Deno.serve(async (requete) => {
  if (requete.method === 'OPTIONS') {
    return new Response('ok', { headers: enTetes })
  }

  try {
    // --- 1. Qui appelle ? ---------------------------------------------------
    const autorisation = requete.headers.get('Authorization')
    if (!autorisation) return reponse({ erreur: 'Non authentifié.' }, 401)

    const clientAppelant = createClient(URL_SUPABASE, CLE_ANON, {
      global: { headers: { Authorization: autorisation } },
    })

    const {
      data: { user: demandeur },
    } = await clientAppelant.auth.getUser()

    if (!demandeur) return reponse({ erreur: 'Session invalide ou expirée.' }, 401)

    // --- 2. Est-il administrateur ? ----------------------------------------
    // Contrôle fait avec la clé de service, donc insensible à ce que le
    // navigateur pourrait raconter.
    const service = createClient(URL_SUPABASE, CLE_SERVICE, {
      auth: { persistSession: false },
    })

    const { data: sonRole } = await service
      .from('user_roles')
      .select('role')
      .eq('user_id', demandeur.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!sonRole) return reponse({ erreur: "Vous n'êtes pas administrateur." }, 403)

    // --- 3. L'action demandée ----------------------------------------------
    const { action, email, userId, redirectTo } = await requete.json().catch(() => ({}))

    if (action === 'lister') {
      const { data: roles, error } = await service
        .from('user_roles')
        .select('user_id, created_at')
        .eq('role', 'admin')
      if (error) throw error

      const { data: comptes } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })

      const administrateurs = (roles ?? []).map((r) => {
        const compte = comptes?.users.find((u) => u.id === r.user_id)
        return {
          user_id: r.user_id,
          email: compte?.email ?? '(compte supprimé)',
          derniere_connexion: compte?.last_sign_in_at ?? null,
          invite_le: r.created_at,
          jamais_connecte: !compte?.last_sign_in_at,
          cest_vous: r.user_id === demandeur.id,
        }
      })

      return reponse({ administrateurs })
    }

    if (action === 'inviter') {
      if (!email || typeof email !== 'string') {
        return reponse({ erreur: 'Adresse e-mail manquante.' }, 400)
      }
      const adresse = email.trim().toLowerCase()

      // On tente l'invitation. Si le compte existe déjà, on ne recrée rien :
      // on lui donne simplement le rôle.
      let cible: string | null = null

      const { data: invite, error: erreurInvitation } = await service.auth.admin.inviteUserByEmail(
        adresse,
        redirectTo ? { redirectTo } : undefined,
      )

      if (invite?.user) {
        cible = invite.user.id
      } else {
        const { data: comptes } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const existant = comptes?.users.find((u) => u.email?.toLowerCase() === adresse)
        if (!existant) {
          return reponse(
            { erreur: erreurInvitation?.message ?? "L'invitation n'a pas pu être envoyée." },
            400,
          )
        }
        cible = existant.id
      }

      const { error: erreurRole } = await service
        .from('user_roles')
        .upsert({ user_id: cible, role: 'admin' }, { onConflict: 'user_id,role' })
      if (erreurRole) throw erreurRole

      return reponse({
        ok: true,
        nouveau_compte: Boolean(invite?.user),
        message: invite?.user
          ? `Invitation envoyée à ${adresse}.`
          : `${adresse} avait déjà un compte : le rôle administrateur lui a été accordé.`,
      })
    }

    if (action === 'revoquer') {
      if (!userId) return reponse({ erreur: 'Identifiant manquant.' }, 400)

      // Deux garde-fous. Sans eux, on peut se retrouver enfermé dehors, et il
      // faudrait repasser par l'éditeur SQL de Supabase pour rentrer.
      if (userId === demandeur.id) {
        return reponse(
          { erreur: 'Vous ne pouvez pas retirer vos propres droits d’administrateur.' },
          400,
        )
      }

      const { count } = await service
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')

      if ((count ?? 0) <= 1) {
        return reponse({ erreur: 'Il doit rester au moins un administrateur.' }, 400)
      }

      const { error } = await service
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin')
      if (error) throw error

      // Le compte n'est pas supprimé, seulement son rôle : la personne pourra
      // encore se connecter, mais ne verra plus le back-office.
      return reponse({ ok: true, message: 'Droits retirés.' })
    }

    return reponse({ erreur: 'Action inconnue.' }, 400)
  } catch (e) {
    return reponse({ erreur: (e as Error).message }, 500)
  }
})
