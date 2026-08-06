import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AtelierCarte } from '@/types/database'

const CHAMPS = `
  id, slug, display_name, vendor_type, contact_name, tagline, city, neighborhood,
  logo_url, cover_url, is_verified, whatsapp_number, price_from_cfa, catalog_url,
  accepts_custom,
  vendor_images ( storage_path, alt_text, sort_order ),
  offers ( count )
`

/**
 * Les ateliers actifs, pour l'accueil.
 *
 * C'est l'écran d'entrée de la phase 1 : on découvre une marque, pas un objet.
 *
 * Le décompte des offres n'est là que pour proposer « Voir ses N pièces » aux
 * créateurs qui en ont saisi et qui n'ont pas de catalogue externe. Il est
 * limité aux offres publiées : compter des brouillons promettrait au visiteur
 * des pièces qu'il ne verrait pas.
 */
export function useAteliers() {
  return useQuery({
    queryKey: ['ateliers'],
    queryFn: async (): Promise<AtelierCarte[]> => {
      const { data, error } = await supabase
        .from('vendors')
        .select(CHAMPS)
        .eq('is_active', true)
        .eq('offers.status', 'published')
        .eq('offers.offer_type', 'product')
        .order('is_verified', { ascending: false })
        .order('display_name')

      if (error) throw error

      const ateliers = (data ?? []) as unknown as AtelierCarte[]
      for (const a of ateliers) {
        a.vendor_images?.sort((x, y) => x.sort_order - y.sort_order)
      }
      return ateliers
    },
  })
}

/**
 * Le nombre de pièces publiées, ou 0.
 *
 * PostgREST renvoie un décompte agrégé sous forme de tableau à un élément :
 * `offers: [{ count: 3 }]`. Cette fonction évite d'écrire cette bizarrerie à
 * chaque endroit où l'on veut simplement un nombre.
 */
export function nombreOffres(a: Pick<AtelierCarte, 'offers'>): number {
  return a.offers?.[0]?.count ?? 0
}
