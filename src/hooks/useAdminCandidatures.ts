import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fabriquerSlug } from '@/lib/slug'
import type { PieceCandidate } from '@/hooks/useCandidature'
import type { VendorType } from '@/types/database'

export interface CandidatureAdmin {
  id: string
  display_name: string
  contact_name: string | null
  whatsapp_number: string
  phone: string | null
  accepts_custom: boolean
  pieces: PieceCandidate[]
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

/** Un identifiant d'adresse libre, même si le nom est déjà pris. */
async function slugLibre(table: 'vendors' | 'offers', propose: string): Promise<string> {
  const base = fabriquerSlug(propose) || table.slice(0, 6)
  const { data } = await supabase.from(table).select('slug').like('slug', `${base}%`)
  const pris = new Set((data ?? []).map((v) => (v as { slug: string }).slug))

  let slug = base
  let n = 2
  while (pris.has(slug)) slug = `${base}-${n++}`
  return slug
}

/**
 * Accepter une candidature : elle devient un atelier, et ses pièces des offres.
 *
 * Les photos ne sont pas déplacées. Elles sont déjà dans le bucket où elles
 * doivent finir, sous « candidatures/… » : on crée simplement les lignes qui
 * pointent dessus. Un déplacement de fichiers serait long, faillible, et sans
 * bénéfice.
 *
 * TOUT EST CRÉÉ MASQUÉ : l'atelier est inactif, les offres sont en brouillon.
 * Vous relisez, vous complétez ce qui manque, puis vous publiez. Rien
 * n'apparaît en ligne du seul fait d'avoir accepté.
 */
export function useAccepterCandidature() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async (c: CandidatureAdmin) => {
      const slug = await slugLibre('vendors', c.display_name)

      const { data: atelier, error: erreurAtelier } = await supabase
        .from('vendors')
        .insert({
          slug,
          display_name: c.display_name,
          contact_name: c.contact_name,
          whatsapp_number: c.whatsapp_number,
          phone: c.phone,
          city: c.city,
          neighborhood: c.neighborhood,
          vendor_type: c.vendor_type,
          tagline: c.tagline,
          bio: c.description,
          price_from_cfa: c.price_from_cfa,
          catalog_url: c.catalog_url,
          instagram_handle: c.instagram,
          accepts_custom: c.accepts_custom,
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

      // Les pièces décrites deviennent des offres, en brouillon. Elles seront
      // prêtes le jour où l'annuaire par objet ouvrira, sans avoir à
      // recontacter le créateur.
      if (c.pieces?.length > 0) {
        const { data: cats } = await supabase.from('categories').select('id, slug')
        const parSlug = new Map(
          (cats ?? []).map((x) => [(x as { slug: string }).slug, (x as { id: string }).id]),
        )

        for (const piece of c.pieces) {
          if (!piece.titre?.trim()) continue

          // La base refuse un prix absent hors « sur devis ». Un créateur qui
          // coche « prix fixe » sans remplir le montant verrait sinon toute son
          // acceptation échouer : on retombe sur « sur devis », que vous
          // corrigerez à la relecture.
          const sansMontant = piece.price_mode !== 'quote' && piece.price_cfa === null
          const modePrix = sansMontant ? 'quote' : piece.price_mode

          const slugOffre = await slugLibre('offers', `${piece.titre} ${c.display_name}`)
          const { data: offre, error: erreurOffre } = await supabase
            .from('offers')
            .insert({
              vendor_id: nouveau.id,
              category_id: piece.categorie_slug ? (parSlug.get(piece.categorie_slug) ?? null) : null,
              offer_type: 'product',
              slug: slugOffre,
              title: piece.titre.trim(),
              description: piece.description,
              price_mode: modePrix,
              price_cfa: modePrix === 'quote' ? null : piece.price_cfa,
              unit: piece.unit,
              is_made_to_order: piece.sur_commande,
              lead_time_days: piece.sur_commande ? piece.delai_jours : null,
              is_customizable: piece.personnalisable,
              origin_city: c.city,
              status: 'draft',
            })
            .select('id')
            .single()

          if (erreurOffre) throw erreurOffre

          if (piece.photos?.length > 0) {
            const { error: erreurImages } = await supabase.from('offer_images').insert(
              piece.photos.map((chemin, i) => ({
                offer_id: (offre as { id: string }).id,
                storage_path: chemin,
                sort_order: i,
              })),
            )
            if (erreurImages) throw erreurImages
          }
        }
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
