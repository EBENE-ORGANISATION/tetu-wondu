import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Offer, OfferStatus } from '@/types/database'

export type OffreAdmin = Offer & {
  offer_images: { id: string; storage_path: string; sort_order: number }[]
}

export function useAdminOffres(statut: OfferStatus | 'tous') {
  return useQuery({
    queryKey: ['admin', 'offres', statut],
    queryFn: async (): Promise<OffreAdmin[]> => {
      let requete = supabase
        .from('offers')
        .select('*, offer_images(id, storage_path, sort_order)')
        .order('updated_at', { ascending: false })

      if (statut !== 'tous') requete = requete.eq('status', statut)

      const { data, error } = await requete
      if (error) throw error
      return (data ?? []) as unknown as OffreAdmin[]
    },
  })
}

/** Les offres d'un atelier — pour dire à l'écran ce qu'une suppression emporte. */
export function useOffresDeLAtelier(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'offres-atelier', vendorId],
    enabled: Boolean(vendorId) && vendorId !== 'nouveau',
    queryFn: async (): Promise<{ id: string; title: string }[]> => {
      const { data, error } = await supabase
        .from('offers')
        .select('id, title')
        .eq('vendor_id', vendorId!)
      if (error) throw error
      return (data ?? []) as { id: string; title: string }[]
    },
  })
}

export function useOffreAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'offre', id],
    enabled: Boolean(id) && id !== 'nouvelle',
    queryFn: async (): Promise<OffreAdmin | null> => {
      const { data, error } = await supabase
        .from('offers')
        .select('*, offer_images(id, storage_path, sort_order)')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return (data as unknown as OffreAdmin | null) ?? null
    },
  })
}

/**
 * Enregistrement d'une offre.
 *
 * Deux colonnes ne doivent JAMAIS figurer dans ce qu'on envoie :
 *  - vendor_display_name, recopiée par un déclencheur ;
 *  - search_vector, calculée par la base.
 * Les écrire à la main serait refusé, et de toute façon écrasé.
 */
export function useEnregistrerOffre() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, valeurs }: { id?: string; valeurs: Partial<Offer> }) => {
      const propre = { ...valeurs }
      delete propre.vendor_display_name

      if (id) {
        const { data, error } = await supabase
          .from('offers')
          .update(propre)
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return data as Offer
      }

      const { data, error } = await supabase.from('offers').insert(propre).select().single()
      if (error) throw error
      return data as Offer
    },
    onSuccess: () => void client.invalidateQueries(),
  })
}

/** Les actions rapides depuis la liste : publier, archiver, rupture de stock. */
export function useActionOffre() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, bout }: { id: string; bout: Partial<Offer> }) => {
      const { error } = await supabase.from('offers').update(bout).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void client.invalidateQueries(),
  })
}

/**
 * « Confirmer la fraîcheur » : redémarre le compte à rebours des 60 jours.
 *
 * Une Edge Function hebdomadaire repassera en brouillon toute offre dont la
 * dernière confirmation dépasse 60 jours. Un catalogue périmé tue ce type de
 * plateforme en trois mois : mieux vaut moins d'offres, mais vraies.
 */
export function useConfirmerFraicheur() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('offers')
        .update({ last_confirmed_at: new Date().toISOString() } as never)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['admin', 'offres'] }),
  })
}

/** Supprime une photo : d'abord le fichier, puis la ligne qui le référence. */
export function useSupprimerImage() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, chemin }: { id: string; chemin: string }) => {
      await supabase.storage.from('offer-images').remove([chemin])
      const { error } = await supabase.from('offer_images').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void client.invalidateQueries(),
  })
}
