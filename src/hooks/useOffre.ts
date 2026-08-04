import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Offer, OfferImage, Vendor } from '@/types/database'

export type OffreComplete = Pick<
  Offer,
  | 'id'
  | 'slug'
  | 'title'
  | 'description'
  | 'details'
  | 'price_mode'
  | 'price_cfa'
  | 'unit'
  | 'is_made_to_order'
  | 'lead_time_days'
  | 'is_customizable'
  | 'is_available'
  | 'origin_city'
> & {
  offer_images: Pick<OfferImage, 'storage_path' | 'alt_text' | 'sort_order'>[]
  categories: { name: string; slug: string } | null
  vendors: Pick<
    Vendor,
    | 'id'
    | 'slug'
    | 'display_name'
    | 'vendor_type'
    | 'tagline'
    | 'city'
    | 'neighborhood'
    | 'logo_url'
    | 'is_verified'
    | 'whatsapp_number'
    | 'phone'
    | 'instagram_handle'
    | 'accepts_custom'
  >
}

/**
 * Une offre publiée, avec ses photos, sa catégorie et son créateur.
 *
 * Le filtre sur « published » est appliqué ici en plus des règles de la base :
 * ceinture et bretelles, pour qu'un brouillon ne soit jamais consultable même
 * si quelqu'un devine son adresse.
 */
export function useOffre(slug: string | undefined) {
  return useQuery({
    queryKey: ['offre', slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<OffreComplete | null> => {
      const { data, error } = await supabase
        .from('offers')
        .select(
          `
          id, slug, title, description, details, price_mode, price_cfa, unit,
          is_made_to_order, lead_time_days, is_customizable, is_available, origin_city,
          offer_images ( storage_path, alt_text, sort_order ),
          categories ( name, slug ),
          vendors!inner (
            id, slug, display_name, vendor_type, tagline, city, neighborhood,
            logo_url, is_verified, whatsapp_number, phone, instagram_handle, accepts_custom
          )
        `,
        )
        .eq('slug', slug!)
        .eq('status', 'published')
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      const offre = data as unknown as OffreComplete
      offre.offer_images?.sort((a, b) => a.sort_order - b.sort_order)
      return offre
    },
  })
}

/** Les autres pièces du même atelier, pour la section de bas de fiche. */
export function useAutresOffres(vendorId: string | undefined, slugExclu: string | undefined) {
  return useQuery({
    queryKey: ['autres-offres', vendorId, slugExclu],
    enabled: Boolean(vendorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select(
          `id, slug, title, price_mode, price_cfa, unit, is_made_to_order,
           lead_time_days, is_customizable, is_available, vendor_display_name,
           offer_images ( storage_path, alt_text, sort_order )`,
        )
        .eq('vendor_id', vendorId!)
        .eq('status', 'published')
        .eq('offer_type', 'product')
        .neq('slug', slugExclu ?? '')
        .limit(8)

      if (error) throw error
      return data ?? []
    },
  })
}
