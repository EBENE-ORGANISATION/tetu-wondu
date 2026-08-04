import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AtelierAvecOffres, Vendor } from '@/types/database'

export type AtelierComplet = Pick<
  Vendor,
  | 'id'
  | 'slug'
  | 'display_name'
  | 'vendor_type'
  | 'contact_name'
  | 'tagline'
  | 'bio'
  | 'story'
  | 'city'
  | 'neighborhood'
  | 'logo_url'
  | 'cover_url'
  | 'accepts_custom'
  | 'is_verified'
  | 'whatsapp_number'
  | 'phone'
  | 'instagram_handle'
> & {
  offers: AtelierAvecOffres['offers']
}

/**
 * Un atelier et tout son catalogue publié.
 *
 * Contrairement à l'accueil, on ne force pas la jointure : un créateur dont
 * toutes les offres sont en brouillon doit rester consultable — sa fiche a
 * une valeur en elle-même, c'est la première décision structurante du projet.
 */
export function useAtelier(slug: string | undefined) {
  return useQuery({
    queryKey: ['atelier', slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<AtelierComplet | null> => {
      const { data, error } = await supabase
        .from('vendors')
        .select(
          `
          id, slug, display_name, vendor_type, contact_name, tagline, bio, story,
          city, neighborhood, logo_url, cover_url, accepts_custom, is_verified,
          whatsapp_number, phone, instagram_handle,
          offers (
            id, slug, title, price_mode, price_cfa, unit,
            is_made_to_order, lead_time_days, is_customizable, is_available,
            vendor_display_name,
            offer_images ( storage_path, alt_text, sort_order )
          )
        `,
        )
        .eq('slug', slug!)
        .eq('is_active', true)
        .eq('offers.status', 'published')
        .eq('offers.offer_type', 'product')
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      const atelier = data as unknown as AtelierComplet
      for (const offre of atelier.offers ?? []) {
        offre.offer_images?.sort((a, b) => a.sort_order - b.sort_order)
      }
      return atelier
    },
  })
}
