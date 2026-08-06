import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Suppression d'un atelier ou d'une offre.
 *
 * ATTENTION À UN POINT QUE LA BASE NE FAIT PAS TOUTE SEULE.
 *   Supprimer un atelier efface bien ses offres et les lignes de ses photos —
 *   c'est le « on delete cascade » du schéma. Mais les FICHIERS eux-mêmes
 *   restent dans le stockage : la base ne connaît pas le contenu des buckets.
 *   Sans le ménage ci-dessous, chaque suppression laisserait derrière elle des
 *   images que plus rien ne référence, invisibles et facturées.
 *
 *   On retire donc les fichiers d'abord, tant qu'on connaît encore leurs
 *   chemins, puis la ligne.
 *
 * CE QUI SURVIT VOLONTAIREMENT
 *   Les événements déjà enregistrés. Leur lien vers l'atelier passe à vide
 *   (« on delete set null ») mais la ligne demeure : vos totaux de vues et de
 *   clics ne doivent pas reculer parce qu'une fiche a été retirée.
 */

async function retirerFichiers(bucket: string, chemins: string[]) {
  if (chemins.length === 0) return
  const { error } = await supabase.storage.from(bucket).remove(chemins)
  if (error) throw new Error(`Les photos n'ont pas pu être supprimées : ${error.message}`)
}

export function useSupprimerAtelier() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async (vendorId: string) => {
      // On récupère tous les chemins AVANT d'effacer quoi que ce soit.
      const { data, error } = await supabase
        .from('vendors')
        .select('vendor_images(storage_path), offers(offer_images(storage_path))')
        .eq('id', vendorId)
        .maybeSingle()
      if (error) throw error

      const contenu = data as unknown as {
        vendor_images: { storage_path: string }[]
        offers: { offer_images: { storage_path: string }[] }[]
      } | null

      const photosAtelier = (contenu?.vendor_images ?? []).map((i) => i.storage_path)
      const photosOffres = (contenu?.offers ?? []).flatMap((o) =>
        (o.offer_images ?? []).map((i) => i.storage_path),
      )

      await retirerFichiers('atelier-images', photosAtelier)
      await retirerFichiers('offer-images', photosOffres)

      const { error: erreurSuppression } = await supabase.from('vendors').delete().eq('id', vendorId)
      if (erreurSuppression) throw erreurSuppression

      return { photos: photosAtelier.length + photosOffres.length }
    },
    onSuccess: () => void client.invalidateQueries(),
  })
}

export function useSupprimerOffre() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async (offerId: string) => {
      const { data, error } = await supabase
        .from('offer_images')
        .select('storage_path')
        .eq('offer_id', offerId)
      if (error) throw error

      const chemins = ((data ?? []) as { storage_path: string }[]).map((i) => i.storage_path)
      await retirerFichiers('offer-images', chemins)

      const { error: erreurSuppression } = await supabase.from('offers').delete().eq('id', offerId)
      if (erreurSuppression) throw erreurSuppression

      return { photos: chemins.length }
    },
    onSuccess: () => void client.invalidateQueries(),
  })
}
