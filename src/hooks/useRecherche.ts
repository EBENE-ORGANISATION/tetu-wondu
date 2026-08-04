import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { OfferCard } from '@/types/database'

export type Tri = 'recent' | 'prix_croissant' | 'prix_decroissant'
export type Dispo = 'tout' | 'disponible' | 'commande'

export interface Filtres {
  q: string
  categorie: string | null
  dispo: Dispo
  personnalisable: boolean
  prixMax: number | null
  tri: Tri
}

export const FILTRES_VIDES: Filtres = {
  q: '',
  categorie: null,
  dispo: 'tout',
  personnalisable: false,
  prixMax: null,
  tri: 'recent',
}

/** Combien de filtres sont actifs — sert au compteur du bouton « Filtres ». */
export function compterFiltres(f: Filtres): number {
  let n = 0
  if (f.categorie) n++
  if (f.dispo !== 'tout') n++
  if (f.personnalisable) n++
  if (f.prixMax !== null) n++
  return n
}

/**
 * Retire les accents d'un texte : « Kpalimé » devient « Kpalime ».
 *
 * Indispensable, et à garder synchronisé avec la base. La migration 0009 a
 * désaccentué la colonne de recherche côté serveur : si on n'en fait pas
 * autant sur le terme tapé, « karité » irait chercher « karité » dans un index
 * qui ne contient plus que « karite ». Les deux vont ensemble.
 *
 * NFD sépare la lettre de son accent ; la plage U+0300 a U+036F supprime les
 * accents ainsi isolés. Écrite en codes d'échappement plutôt qu'en caractères
 * littéraux : des signes invisibles dans un fichier source finissent toujours
 * par être mangés par un éditeur ou un copier-coller.
 */
function sansAccents(texte: string): string {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * La recherche du catalogue.
 *
 * Le texte est confié à la colonne search_vector, calculée par la base à
 * partir du titre, de la description, de la ville ET du nom du créateur.
 * C'est ce qui permet de taper « Flok » et de tomber sur ses mugs.
 */
export function useRecherche(filtres: Filtres) {
  return useQuery({
    queryKey: ['recherche', filtres],
    queryFn: async (): Promise<OfferCard[]> => {
      let requete = supabase
        .from('offers')
        .select(
          `id, slug, title, price_mode, price_cfa, unit, is_made_to_order,
           lead_time_days, is_customizable, is_available, vendor_display_name,
           offer_images ( storage_path, alt_text, sort_order )`,
        )
        .eq('status', 'published')
        .eq('offer_type', 'product')

      if (filtres.q.trim()) {
        requete = requete.textSearch('search_vector', sansAccents(filtres.q.trim()), {
          type: 'plain',
          config: 'french',
        })
      }

      if (filtres.categorie) requete = requete.eq('category_id', filtres.categorie)

      if (filtres.dispo === 'disponible') {
        requete = requete.eq('is_made_to_order', false).eq('is_available', true)
      } else if (filtres.dispo === 'commande') {
        requete = requete.eq('is_made_to_order', true)
      }

      if (filtres.personnalisable) requete = requete.eq('is_customizable', true)

      if (filtres.prixMax !== null) {
        // Les offres « sur devis » n'ont pas de prix. Les exclure d'une
        // fourchette reviendrait à les rendre introuvables dès qu'on touche au
        // curseur — or ce sont souvent les pièces les plus intéressantes.
        requete = requete.or(`price_mode.eq.quote,price_cfa.lte.${filtres.prixMax}`)
      }

      if (filtres.tri === 'prix_croissant') {
        requete = requete.order('price_cfa', { ascending: true, nullsFirst: false })
      } else if (filtres.tri === 'prix_decroissant') {
        requete = requete.order('price_cfa', { ascending: false, nullsFirst: false })
      } else {
        requete = requete.order('created_at', { ascending: false })
      }

      const { data, error } = await requete.limit(60)
      if (error) throw error

      const offres = (data ?? []) as unknown as OfferCard[]
      for (const o of offres) o.offer_images?.sort((a, b) => a.sort_order - b.sort_order)
      return offres
    },
  })
}
