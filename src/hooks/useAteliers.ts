import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AtelierAvecOffres } from '@/types/database'

/**
 * Les ateliers actifs et leurs offres publiées, pour l'accueil.
 *
 * Une seule requête, pas une par atelier : sur 3G, huit allers-retours au lieu
 * d'un se voient à l'œil nu.
 *
 * Trois filtres appliqués côté base, jamais côté navigateur :
 *  - créateur actif,
 *  - offre publiée (les brouillons ne doivent pas fuiter),
 *  - offre de type « produit » — les services existent dans le schéma mais ne
 *    s'ouvriront que plus tard.
 */
export function useAteliers() {
  return useQuery({
    queryKey: ['ateliers'],
    queryFn: async (): Promise<AtelierAvecOffres[]> => {
      const { data, error } = await supabase
        .from('vendors')
        .select(
          `
          id, slug, display_name, vendor_type, contact_name, tagline, city, neighborhood,
          logo_url, is_verified, whatsapp_number,
          offers!inner (
            id, slug, title, price_mode, price_cfa, unit,
            is_made_to_order, lead_time_days, is_customizable, is_available,
            vendor_display_name,
            offer_images ( storage_path, alt_text, sort_order )
          )
        `,
        )
        .eq('is_active', true)
        .eq('offers.status', 'published')
        .eq('offers.offer_type', 'product')
        .order('display_name')

      if (error) throw error

      const ateliers = (data ?? []) as unknown as AtelierAvecOffres[]

      // Les photos sont triées ici plutôt que dans la requête : PostgREST ne
      // sait pas ordonner une relation imbriquée à deux niveaux, et trier
      // quelques éléments en mémoire ne coûte rien.
      for (const atelier of ateliers) {
        for (const offre of atelier.offers) {
          offre.offer_images?.sort((a, b) => a.sort_order - b.sort_order)
        }
      }

      return ateliers
    },
  })
}
