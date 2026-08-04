import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

/**
 * La session en cours.
 *
 * Aucun mot de passe nulle part : la connexion se fait par lien magique
 * envoyé par e-mail. Décision prise au lancement — les créateurs n'ont pas de
 * compte, seul l'administrateur se connecte, et un OTP par SMS vers le Togo
 * coûterait entre 30 et 80 FCFA par message pour rien.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChargement(false)
    })

    const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, s) => {
      setSession(s)
      setChargement(false)
    })

    return () => abonnement.subscription.unsubscribe()
  }, [])

  return { session, chargement }
}

/**
 * Le rôle est lu dans user_roles, JAMAIS dans une colonne du profil.
 *
 * C'est la règle de sécurité la plus importante du projet : si le rôle vivait
 * dans profiles, que son propriétaire peut modifier, n'importe quel utilisateur
 * pourrait se promouvoir administrateur.
 *
 * Cette lecture ne protège rien à elle seule — elle sert à afficher ou masquer
 * des écrans. La vraie protection est dans la base : même en trichant ici, un
 * non-administrateur se verrait refuser chaque écriture.
 */
export function useEstAdmin() {
  const { session, chargement: chargementSession } = useSession()

  const { data: estAdmin, isPending } = useQuery({
    queryKey: ['role-admin', session?.user.id],
    enabled: Boolean(session?.user.id),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session!.user.id)
        .eq('role', 'admin')
        .maybeSingle()

      if (error) throw error
      return Boolean(data)
    },
  })

  return {
    session,
    estAdmin: estAdmin ?? false,
    chargement: chargementSession || (Boolean(session) && isPending),
  }
}
