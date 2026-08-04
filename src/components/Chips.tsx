import { disponibilite } from '@/lib/format'

/**
 * Les trois signaux qu'un acheteur cherche avant tout : est-ce disponible,
 * combien de temps, et puis-je le faire à ma façon. Ils sont posés en haut de
 * fiche, avant la description — personne ne lit un paragraphe pour découvrir
 * ensuite que l'objet n'existe pas encore.
 */

export function ChipDispo({
  offre,
  compact = false,
}: {
  offre: { is_available: boolean; is_made_to_order: boolean; lead_time_days: number | null }
  /** Dans une grille à deux colonnes, « 4 jours » passe à la ligne. « 4 j » non. */
  compact?: boolean
}) {
  const { libelle: complet, ton } = disponibilite(offre)
  const libelle = compact
    ? complet.replace(' jours', ' j').replace('Momentanément indisponible', 'Indisponible')
    : complet

  const pastille =
    ton === 'vert' ? 'bg-whatsapp' : ton === 'ambre' ? 'bg-commande' : 'bg-second'

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ligne bg-blanc px-3 py-1.5 font-action text-xs font-semibold text-encre">
      <span className={`size-2 shrink-0 rounded-full ${pastille}`} aria-hidden="true" />
      {libelle}
    </span>
  )
}

export function ChipPerso() {
  return (
    <span className="inline-flex items-center rounded-full bg-perso px-3 py-1.5 font-action text-xs font-bold text-encre">
      Personnalisable
    </span>
  )
}

export function ChipInfo({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ligne bg-blanc px-3 py-1.5 font-action text-xs font-semibold text-second">
      {children}
    </span>
  )
}
