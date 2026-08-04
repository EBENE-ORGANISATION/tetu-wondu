import type { PriceMode, VendorType } from '@/types/database'

/**
 * Les règles d'affichage du prix et de la disponibilité.
 *
 * Elles vivent ici et nulle part ailleurs : un prix mal formaté sur un seul
 * écran suffit à faire douter de tout le catalogue.
 */

// Intl produit le séparateur français : une espace fine insécable. « 3 000 »
// ne se coupera donc jamais en fin de ligne, et jamais de virgule.
const nombre = new Intl.NumberFormat('fr-FR')

/** « 3 000 FCFA » — le montant seul, sans le libellé du mode. */
export function montant(cfa: number): string {
  return `${nombre.format(cfa)} FCFA`
}

/**
 * Le prix complet, selon les trois modes.
 *
 * En mode « quote », price_cfa vaut NULL en base : il ne faut JAMAIS afficher
 * 0 FCFA, ce qui laisserait croire que l'objet est gratuit.
 */
export function prix(mode: PriceMode, cfa: number | null): string {
  if (mode === 'quote' || cfa === null) return 'Sur devis'
  if (mode === 'from') return `À partir de ${montant(cfa)}`
  return montant(cfa)
}

/** Version courte pour les vignettes serrées : « dès 25 000 FCFA ». */
export function prixCourt(mode: PriceMode, cfa: number | null): string {
  if (mode === 'quote' || cfa === null) return 'Sur devis'
  if (mode === 'from') return `dès ${montant(cfa)}`
  return montant(cfa)
}

export type Disponibilite = {
  libelle: string
  /** 'vert' = en stock, 'ambre' = à fabriquer, 'gris' = indisponible. */
  ton: 'vert' | 'ambre' | 'gris'
}

export function disponibilite(o: {
  is_available: boolean
  is_made_to_order: boolean
  lead_time_days: number | null
}): Disponibilite {
  if (!o.is_available) {
    return { libelle: 'Momentanément indisponible', ton: 'gris' }
  }
  if (o.is_made_to_order) {
    const jours = o.lead_time_days
    return {
      libelle: jours ? `Sur commande · ${jours} jours` : 'Sur commande',
      ton: 'ambre',
    }
  }
  return { libelle: 'Disponible', ton: 'vert' }
}

const METIERS: Record<VendorType, string> = {
  maker: 'Fabrication',
  transformer: 'Transformation',
  creator: 'Création',
  service: 'Service',
}

export function metier(type: VendorType): string {
  return METIERS[type]
}

/**
 * Le monogramme affiché à la place du logo tant qu'il n'y a pas de photo.
 *
 * « Karité de Kara » → KK, « Flok 228 » → FL. Les mots de liaison et les
 * nombres sont ignorés : ils ne disent rien de l'atelier.
 */
const LIAISONS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', "d'", 'aux', 'au'])

export function monogramme(nom: string): string {
  const mots = nom
    .split(/[\s-]+/)
    .filter((m) => m.length > 0 && !LIAISONS.has(m.toLowerCase()) && !/^\d+$/.test(m))

  if (mots.length === 0) return nom.slice(0, 2).toUpperCase()
  if (mots.length === 1) return mots[0]!.slice(0, 2).toUpperCase()
  return (mots[0]![0]! + mots[1]![0]!).toUpperCase()
}
