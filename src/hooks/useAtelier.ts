import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AtelierAvecOffres, Vendor, VendorImage } from '@/types/database'

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
  | 'price_from_cfa'
  | 'catalog_url'
> & {
  vendor_images: Pick<VendorImage, 'storage_path' | 'alt_text' | 'sort_order'>[]
  offers: AtelierAvecOffres['offers']
}

/**
 * Un atelier et tout ce qu'il expose.
 *
 * En phase 1, c'est la fiche principale du site — l'unité que le visiteur
 * découvre, partage et contacte.
 *
 * Ses offres sont chargées quand même : si le créateur n'a pas indiqué de
 * catalogue externe mais a des pièces saisies, on les montre. C'est le choix
 * « les deux, au créateur de décider ».
 *
 * On ne force pas la jointure sur les offres : un atelier sans aucune pièce
 * reste consultable. Sa fiche a une valeur en elle-même — c'est la première
 * décision structurante du projet.
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
          whatsapp_number, phone, instagram_handle, price_from_cfa, catalog_url,
          vendor_images ( storage_path, alt_text, sort_order ),
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
      atelier.vendor_images?.sort((a, b) => a.sort_order - b.sort_order)
      for (const offre of atelier.offers ?? []) {
        offre.offer_images?.sort((a, b) => a.sort_order - b.sort_order)
      }
      return atelier
    },
  })
}
