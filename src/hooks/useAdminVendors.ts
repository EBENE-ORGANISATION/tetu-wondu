import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Vendor } from '@/types/database'

export type VendorAdmin = Vendor & { offers: { count: number }[] }

/**
 * Tous les créateurs, y compris désactivés.
 *
 * Un administrateur les voit tous grâce à la politique RLS « admins gèrent les
 * créateurs ». Un visiteur, avec la même requête, ne verrait que les actifs.
 */
export function useAdminVendors() {
  return useQuery({
    queryKey: ['admin', 'vendors'],
    queryFn: async (): Promise<VendorAdmin[]> => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*, offers(count)')
        .order('display_name')

      if (error) throw error
      return (data ?? []) as unknown as VendorAdmin[]
    },
  })
}

export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'vendor', id],
    enabled: Boolean(id) && id !== 'nouveau',
    queryFn: async (): Promise<Vendor | null> => {
      const { data, error } = await supabase.from('vendors').select('*').eq('id', id!).maybeSingle()
      if (error) throw error
      return (data as Vendor | null) ?? null
    },
  })
}

/**
 * Création et modification d'un créateur.
 *
 * vendor_display_name n'est jamais recopié à la main dans les offres : le
 * déclencheur de la base s'en charge, y compris lors d'un changement de nom.
 */
export function useEnregistrerVendor() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, valeurs }: { id?: string; valeurs: Partial<Vendor> }) => {
      if (id) {
        const { data, error } = await supabase
          .from('vendors')
          .update(valeurs)
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return data as Vendor
      }

      const { data, error } = await supabase.from('vendors').insert(valeurs).select().single()
      if (error) throw error
      return data as Vendor
    },
    onSuccess: () => {
      // Le nom d'un créateur apparaît sur l'accueil, dans la recherche et sur
      // chaque fiche : on invalide large plutôt que de pister chaque endroit.
      void client.invalidateQueries()
    },
  })
}
