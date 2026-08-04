import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/types/database'

/**
 * Les catégories affichables.
 *
 * Le filtre sur « product » n'est pas cosmétique : la base contient déjà les
 * cinq catégories de services (traiteur, coiffure, photo…), préparées pour
 * plus tard. Elles ne doivent apparaître nulle part au lancement.
 *
 * Les catégories ne changent jamais : inutile de les redemander.
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    staleTime: Infinity,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, icon_name, applies_to, sort_order')
        .eq('applies_to', 'product')
        .order('sort_order')

      if (error) throw error
      return (data ?? []) as Category[]
    },
  })
}

/**
 * Le prix le plus élevé du catalogue, pour borner le curseur de la fourchette
 * de prix. Calculé plutôt que codé en dur : le jour où une pièce à 200 000
 * FCFA arrive, le filtre s'adapte tout seul.
 */
export function usePrixMax() {
  return useQuery({
    queryKey: ['prix-max'],
    staleTime: Infinity,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('offers')
        .select('price_cfa')
        .eq('status', 'published')
        .eq('offer_type', 'product')
        .not('price_cfa', 'is', null)
        .order('price_cfa', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      // Arrondi au millier supérieur, pour un curseur qui tombe juste.
      const max = (data?.price_cfa as number | undefined) ?? 50000
      return Math.ceil(max / 1000) * 1000
    },
  })
}
