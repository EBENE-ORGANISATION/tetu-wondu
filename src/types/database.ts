/**
 * Types du schéma Supabase.
 *
 * Écrits à la main volontairement : ils décrivent ce que l'application a le
 * droit de lire et d'écrire, pas tout ce que la base contient. Deux colonnes
 * sont marquées en lecture seule — les écrire depuis l'application serait une
 * erreur, la base les entretient elle-même.
 */

export type OfferType = 'product' | 'service'
export type OfferStatus = 'draft' | 'pending' | 'published' | 'archived'
export type PriceMode = 'fixed' | 'from' | 'quote'
export type VendorType = 'maker' | 'transformer' | 'creator' | 'service'

export type EventType =
  | 'offer_view'
  | 'vendor_view'
  | 'whatsapp_click'
  | 'phone_click'
  | 'instagram_click'
  | 'search'
  | 'category_view'

export interface Vendor {
  id: string
  slug: string
  display_name: string
  vendor_type: VendorType
  contact_name: string | null
  whatsapp_number: string
  phone: string | null
  instagram_handle: string | null
  city: string
  neighborhood: string | null
  tagline: string | null
  bio: string | null
  story: string | null
  logo_url: string | null
  cover_url: string | null
  accepts_custom: boolean
  is_verified: boolean
  is_active: boolean
}

export interface Offer {
  id: string
  vendor_id: string
  category_id: string | null
  offer_type: OfferType
  slug: string
  title: string
  description: string | null
  details: string | null
  price_mode: PriceMode
  price_cfa: number | null
  unit: string | null
  is_made_to_order: boolean
  lead_time_days: number | null
  is_customizable: boolean
  origin_city: string | null
  status: OfferStatus
  is_available: boolean
  /**
   * Date de la dernière confirmation de fraîcheur. Une Edge Function
   * hebdomadaire repassera en brouillon toute offre dont cette date dépasse
   * 60 jours : un catalogue périmé tue ce type de plateforme en trois mois.
   */
  last_confirmed_at: string
  /** LECTURE SEULE — recopié par un déclencheur de la base. Ne jamais l'écrire. */
  vendor_display_name: string | null
}

export interface OfferImage {
  id: string
  offer_id: string
  storage_path: string
  alt_text: string | null
  sort_order: number
}

export interface Category {
  id: string
  name: string
  slug: string
  icon_name: string | null
  applies_to: OfferType
  sort_order: number
}

/** Une offre telle qu'affichée sur une carte, avec ses images. */
export type OfferCard = Pick<
  Offer,
  | 'id'
  | 'slug'
  | 'title'
  | 'price_mode'
  | 'price_cfa'
  | 'unit'
  | 'is_made_to_order'
  | 'lead_time_days'
  | 'is_customizable'
  | 'is_available'
  | 'vendor_display_name'
> & {
  offer_images: Pick<OfferImage, 'storage_path' | 'alt_text' | 'sort_order'>[]
}

/** Un créateur et les offres publiées de son atelier. */
export type AtelierAvecOffres = Pick<
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
> & {
  offers: OfferCard[]
}
