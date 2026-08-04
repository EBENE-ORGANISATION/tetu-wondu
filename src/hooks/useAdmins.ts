import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Administrateur {
  user_id: string
  email: string
  derniere_connexion: string | null
  invite_le: string
  jamais_connecte: boolean
  cest_vous: boolean
}

/**
 * Tout passe par la fonction serveur « administrateurs ».
 *
 * On ne peut pas lire la liste des comptes depuis le navigateur : la table des
 * utilisateurs n'y est pas exposée, et c'est très bien ainsi. La fonction, elle,
 * dispose de la clé de service et vérifie à chaque appel que le demandeur est
 * bien administrateur.
 */
async function appeler<T>(corps: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('administrateurs', { body: corps })

  if (error) {
    // L'erreur renvoyée par la fonction est plus parlante que celle du
    // transport : on va la chercher dans la réponse quand elle existe.
    const detail = (data as { erreur?: string } | null)?.erreur
    throw new Error(detail ?? messageLisible(error.message))
  }
  if ((data as { erreur?: string })?.erreur) {
    throw new Error((data as { erreur: string }).erreur)
  }
  return data as T
}

function messageLisible(brut: string): string {
  if (brut.includes('Failed to send') || brut.includes('FunctionsFetchError')) {
    return "La fonction « administrateurs » ne répond pas. A-t-elle été déployée dans Supabase ?"
  }
  return brut
}

export function useAdministrateurs() {
  return useQuery({
    queryKey: ['admin', 'administrateurs'],
    queryFn: () => appeler<{ administrateurs: Administrateur[] }>({ action: 'lister' }),
    select: (d) => d.administrateurs,
  })
}

export function useInviterAdmin() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (email: string) =>
      appeler<{ message: string }>({
        action: 'inviter',
        email,
        redirectTo: `${window.location.origin}/admin`,
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['admin', 'administrateurs'] }),
  })
}

export function useRevoquerAdmin() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      appeler<{ message: string }>({ action: 'revoquer', userId }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['admin', 'administrateurs'] }),
  })
}
