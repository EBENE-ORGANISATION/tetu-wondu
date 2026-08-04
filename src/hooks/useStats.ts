import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface LigneStat {
  offer_id: string
  title: string
  display_name: string
  views: number
  whatsapp_clicks: number
}

/**
 * Les chiffres du tableau de bord, sur une période glissante.
 *
 * Passe par la fonction offer_stats_period plutôt que par une lecture directe
 * de events : la table brute est réservée aux administrateurs, et l'agrégation
 * côté base évite de rapatrier des milliers de lignes sur un téléphone.
 *
 * RAPPEL IMPORTANT : ces chiffres prouvent des CLICS, pas des ventes. C'est
 * exactement la question que posera un créateur ou un investisseur. Le seul
 * moyen de la combler est un message WhatsApp mensuel à chaque créateur —
 * « combien de commandes via la plateforme ce mois-ci ? » — consigné à part.
 */
export function useStats(jours: 7 | 30) {
  return useQuery({
    queryKey: ['stats', jours],
    queryFn: async (): Promise<LigneStat[]> => {
      const { data, error } = await supabase.rpc('offer_stats_period', { days: jours })
      if (error) throw error

      const lignes = (data ?? []) as LigneStat[]
      return lignes.sort(
        (a, b) => b.whatsapp_clicks - a.whatsapp_clicks || b.views - a.views,
      )
    },
  })
}
