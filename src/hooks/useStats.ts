import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface LigneStat {
  offer_id: string
  title: string
  display_name: string
  views: number
  whatsapp_clicks: number
}

export interface LigneAtelier {
  vendor_id: string
  display_name: string
  city: string
  vues: number
  whatsapp: number
  catalogue: number
  instagram: number
  telephone: number
}

/**
 * Les chiffres par atelier — la vue principale en phase 1.
 *
 * Elle montre les cinq sorties possibles, pas seulement WhatsApp : un visiteur
 * peut aussi partir vers un catalogue externe, vers Instagram ou vers le
 * téléphone. Ces trois-là étaient enregistrés depuis le début sans jamais être
 * affichés — donc invisibles.
 *
 * RAPPEL IMPORTANT : ces chiffres prouvent des CLICS, pas des ventes. C'est
 * exactement la question que posera un créateur ou un investisseur. Le seul
 * moyen de la combler est un message WhatsApp mensuel à chaque créateur —
 * « combien de commandes via la plateforme ce mois-ci ? » — consigné à part.
 */
export function useStatsAteliers(jours: 7 | 30) {
  return useQuery({
    queryKey: ['stats-ateliers', jours],
    queryFn: async (): Promise<LigneAtelier[]> => {
      const { data, error } = await supabase.rpc('vendor_stats_period', { days: jours })
      if (error) throw error

      const lignes = (data ?? []) as LigneAtelier[]
      return lignes.sort(
        (a, b) => b.whatsapp - a.whatsapp || b.vues - a.vues || a.display_name.localeCompare(b.display_name),
      )
    },
  })
}

/**
 * Les chiffres par objet — conservés pour les créateurs qui ont saisi des
 * pièces dans l'application. Secondaire en phase 1.
 */
export function useStats(jours: 7 | 30) {
  return useQuery({
    queryKey: ['stats', jours],
    queryFn: async (): Promise<LigneStat[]> => {
      const { data, error } = await supabase.rpc('offer_stats_period', { days: jours })
      if (error) throw error

      const lignes = (data ?? []) as LigneStat[]
      return lignes.sort((a, b) => b.whatsapp_clicks - a.whatsapp_clicks || b.views - a.views)
    },
  })
}
