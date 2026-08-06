import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { VendorImage } from '@/types/database'

/** Les photos d'un atelier, pour le formulaire de saisie. */
export function usePhotosAtelier(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'photos-atelier', vendorId],
    enabled: Boolean(vendorId) && vendorId !== 'nouveau',
    queryFn: async (): Promise<VendorImage[]> => {
      const { data, error } = await supabase
        .from('vendor_images')
        .select('id, vendor_id, storage_path, alt_text, sort_order')
        .eq('vendor_id', vendorId!)
        .order('sort_order')

      if (error) throw error
      return (data ?? []) as VendorImage[]
    },
  })
}

/** Supprime une photo : d'abord le fichier, puis la ligne qui le référence. */
export function useSupprimerPhotoAtelier() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, chemin }: { id: string; chemin: string }) => {
      await supabase.storage.from('atelier-images').remove([chemin])
      const { error } = await supabase.from('vendor_images').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void client.invalidateQueries(),
  })
}
