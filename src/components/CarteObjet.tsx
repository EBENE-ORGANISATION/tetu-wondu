import { Link } from 'react-router-dom'
import { prixCourt } from '@/lib/format'
import { urlImage } from '@/lib/images'
import { ChipDispo } from '@/components/Chips'
import type { OfferCard } from '@/types/database'

/**
 * La carte d'un objet dans une grille de résultats.
 *
 * Elle porte le nom du créateur, contrairement à la vignette de l'accueil :
 * dans une liste mélangée, savoir de quel atelier vient l'objet est ce qui
 * permet de choisir.
 */
export function CarteObjet({ offre }: { offre: OfferCard }) {
  const photo = offre.offer_images?.[0]

  return (
    <Link to={`/offre/${offre.slug}`} className={offre.is_available ? '' : 'opacity-45'}>
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
        {offre.is_customizable && offre.is_available && (
          <span className="absolute top-1.5 left-1.5 rounded-md bg-perso px-1.5 py-0.5 font-action text-[10px] font-bold text-encre">
            Perso.
          </span>
        )}
      </div>

      <p className="mt-2 line-clamp-2 text-sm leading-snug font-medium text-encre">{offre.title}</p>

      {offre.vendor_display_name && (
        <p className="truncate text-xs text-second">{offre.vendor_display_name}</p>
      )}

      <p className="mt-0.5 font-action text-sm font-bold text-accent">
        {prixCourt(offre.price_mode, offre.price_cfa)}
      </p>

      <div className="mt-1.5">
        <ChipDispo offre={offre} compact />
      </div>
    </Link>
  )
}
