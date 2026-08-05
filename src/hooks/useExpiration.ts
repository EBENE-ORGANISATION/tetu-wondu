import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface RapportExpiration {
  simulation: boolean
  concernees: number
  depubliees: number
  message: string
  offres: { slug: string; titre: string; createur: string | null; jours: number }[]
  createurs_a_rappeler: {
    nom: string
    contact: string | null
    whatsapp: string
    offres: string[]
  }[]
}

/**
 * Déclenche la vérification de fraîcheur à la main.
 *
 * La tâche planifiée fait la même chose chaque semaine. Ce bouton sert à deux
 * choses : voir ce qui se passerait avant que ça se passe, et rattraper le
 * jour où l'on veut nettoyer sans attendre le prochain passage.
 */
export function useExpiration() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async (simulation: boolean): Promise<RapportExpiration> => {
      const { data, error } = await supabase.functions.invoke('expiration-fiches', {
        body: { simulation },
      })

      if (error) {
        const detail = (data as { erreur?: string } | null)?.erreur
        throw new Error(
          detail ??
            (error.message.includes('Failed to send') || error.message.includes('FunctionsFetch')
              ? "La fonction « expiration-fiches » ne répond pas. A-t-elle été déployée dans Supabase ?"
              : error.message),
        )
      }
      if ((data as { erreur?: string })?.erreur) throw new Error((data as { erreur: string }).erreur)

      return data as RapportExpiration
    },
    onSuccess: (rapport) => {
      // En simulation rien n'a bougé : inutile de recharger les listes.
      if (!rapport.simulation) void client.invalidateQueries()
    },
  })
}
