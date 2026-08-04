import { Link } from 'react-router-dom'
import { prixCourt } from '@/lib/format'
import { urlImage } from '@/lib/images'
import type { OfferCard } from '@/types/database'

/**
 * Une offre dans la rangée horizontale d'un atelier.
 *
 * Format volontairement serré : le visiteur doit pouvoir balayer six objets
 * d'un coup de pouce. Le détail est sur la fiche, pas ici — seuls le nom, le
 * prix et l'éventuelle personnalisation apparaissent.
 */
export function VignetteObjet({ offre }: { offre: OfferCard }) {
  const photo = offre.offer_images?.[0]
  const indisponible = !offre.is_available

  return (
    <Link
      to={`/offre/${offre.slug}`}
      className={`block w-36 shrink-0 snap-start ${indisponible ? 'opacity-45' : ''}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-xl">
        {photo ? (
          <img
            src={urlImage(photo.storage_path)}
            alt={photo.alt_text ?? offre.title}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <div className="hachure size-full" />
        )}

        {offre.is_customizable && !indisponible && (
          <span className="absolute top-1.5 left-1.5 rounded-md bg-perso px-1.5 py-0.5 font-action text-[10px] font-bold text-encre">
            Perso.
          </span>
        )}
      </div>

      {/* line-clamp-2 : deux lignes maximum, sinon les rangées se désalignent
          dès qu'un objet a un nom long. */}
      <p className="mt-2 line-clamp-2 text-sm leading-snug font-medium text-encre">{offre.title}</p>

      <p className="mt-0.5 font-action text-sm font-bold text-accent">
        {prixCourt(offre.price_mode, offre.price_cfa)}
      </p>
    </Link>
  )
}
