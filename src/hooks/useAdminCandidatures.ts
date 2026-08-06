import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fabriquerSlug } from '@/lib/slug'
import type { VendorType } from '@/types/database'

export interface CandidatureAdmin {
  id: string
  display_name: string
  contact_name: string | null
  whatsapp_number: string
  city: string
  neighborhood: string | null
  vendor_type: VendorType
  tagline: string | null
  description: string | null
  price_from_cfa: number | null
  catalog_url: string | null
  instagram: string | null
  photos: string[]
  statut: 'nouvelle' | 'acceptee' | 'refusee'
  vendor_id: string | null
  created_at: string
}

export function useCandidatures(statut: 'nouvelle' | 'acceptee' | 'refusee' | 'toutes') {
  return useQuery({
    queryKey: ['admin', 'candidatures', statut],
    queryFn: async (): Promise<CandidatureAdmin[]> => {
      let requete = supabase.from('candidatures').select('*').order('created_at', { ascending: false })
      if (statut !== 'toutes') requete = requete.eq('statut', statut)

      const { data, error } = await requete
      if (error) throw error
      return (data ?? []) as CandidatureAdmin[]
    },
  })
}

/**
 * Accepter une candidature : elle devient un atelier.
 *
 * Les photos ne sont pas déplacées. Elles sont déjà dans le bon bucket, sous
 * « candidatures/… » : on crée simplement les lignes qui pointent dessus. Un
 * déplacement de fichiers serait long, faillible, et sans bénéfice.
 *
 * L'atelier est créé MASQUÉ. Vous le relisez, vous complétez ce qui manque,
 * puis vous le rendez visible depuis sa fiche. Rien n'apparaît en ligne du seul
 * fait d'avoir accepté.
 */
export function useAccepterCandidature() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async (c: CandidatureAdmin) => {
      // Un identifiant d'adresse unique, même si deux ateliers portent le même
      // nom : sans cela, la création échouerait sur la contrainte d'unicité.
      const base = fabriquerSlug(c.display_name) || 'atelier'
      const { data: existants } = await supabase
        .from('vendors')
        .select('slug')
        .like('slug', `${base}%`)

      const pris = new Set((existants ?? []).map((v) => (v as { slug: string }).slug))
      let slug = base
      let n = 2
      while (pris.has(slug)) slug = `${base}-${n++}`

      const { data: atelier, error: erreurAtelier } = await supabase
        .from('vendors')
        .insert({
          slug,
          display_name: c.display_name,
          contact_name: c.contact_name,
          whatsapp_number: c.whatsapp_number,
          city: c.city,
          neighborhood: c.neighborhood,
          vendor_type: c.vendor_type,
          tagline: c.tagline,
          bio: c.description,
          price_from_cfa: c.price_from_cfa,
          catalog_url: c.catalog_url,
          instagram_handle: c.instagram,
          is_active: false, // masqué jusqu'à votre relecture
          is_verified: false,
        })
        .select('id, slug')
        .single()

      if (erreurAtelier) throw erreurAtelier
      const nouveau = atelier as { id: string; slug: string }

      if (c.photos.length > 0) {
        const { error: erreurPhotos } = await supabase.from('vendor_images').insert(
          c.photos.map((chemin, i) => ({
            vendor_id: nouveau.id,
            storage_path: chemin,
            sort_order: i,
          })),
        )
        if (erreurPhotos) throw erreurPhotos
      }

      const { error: erreurStatut } = await supabase
        .from('candidatures')
        .update({ statut: 'acceptee', vendor_id: nouveau.id })
        .eq('id', c.id)
      if (erreurStatut) throw erreurStatut

      return nouveau
    },
    onSuccess: () => void client.invalidateQueries(),
  })
}

/** Refuser : la candidature reste, marquée, pour ne pas la retraiter deux fois. */
export function useRefuserCandidature() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { error } = await supabase
        .from('candidatures')
        .update({ statut: 'refusee', note_admin: note ?? null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['admin', 'candidatures'] }),
  })
}
