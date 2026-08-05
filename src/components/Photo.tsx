import { useState } from 'react'
import { urlImage } from '@/lib/images'

/**
 * Une photo d'offre, avec son cadre de remplacement.
 *
 * Deux cas mènent au même résultat visible, et c'est voulu :
 *   - l'offre n'a pas encore de photo ;
 *   - la photo existe mais n'a pas pu être chargée (réseau coupé).
 *
 * Dans les deux cas on affiche un cadre hachuré plutôt qu'une icône d'image
 * cassée. Le catalogue reste présentable, la mise en page ne bouge pas, et le
 * visiteur n'a pas l'impression que le site est en panne.
 *
 * La mention « image en attente » n'apparaît que sur les grands formats : sur
 * une vignette de 36 pixels elle serait illisible et inutile.
 */
export function Photo({
  chemin,
  alt,
  mention = false,
  eager = false,
  className = '',
}: {
  /** Le chemin dans le bucket, ou rien si l'offre n'a pas de photo. */
  chemin?: string | null
  alt: string
  /** Afficher « image en attente » dans le cadre vide. */
  mention?: boolean
  /** Charger sans attendre : uniquement pour l'image principale d'une fiche. */
  eager?: boolean
  className?: string
}) {
  const [echec, setEchec] = useState(false)

  if (!chemin || echec) {
    return (
      <div className={`hachure flex items-center justify-center ${className}`}>
        {mention && <span className="font-action text-xs text-second">image en attente</span>}
      </div>
    )
  }

  return (
    <img
      src={urlImage(chemin)}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setEchec(true)}
      className={`object-cover ${className}`}
    />
  )
}
