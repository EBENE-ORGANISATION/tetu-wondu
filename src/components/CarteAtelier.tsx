import { Link } from 'react-router-dom'
import { Photo } from '@/components/Photo'
import { Monogramme } from '@/components/Monogramme'
import { metier, montant } from '@/lib/format'
import { nombreOffres } from '@/hooks/useAteliers'
import type { AtelierCarte } from '@/types/database'

/**
 * Un atelier dans la liste d'accueil.
 *
 * C'est l'unité de la phase 1 : on présente une marque, pas un objet. La photo
 * occupe donc la plus grande place — c'est elle qui donne envie d'entrer, bien
 * avant le texte.
 *
 * Le prix de départ est affiché quand le créateur en a donné un. Quand il n'y
 * en a pas, on n'invente rien et on n'écrit rien : une case vide vaut mieux
 * qu'un « Sur devis » que le créateur n'a jamais dit.
 */
export function CarteAtelier({ atelier }: { atelier: AtelierCarte }) {
  const photo = atelier.vendor_images?.[0]
  const lieu = atelier.neighborhood ? `${atelier.city}, ${atelier.neighborhood}` : atelier.city
  const pieces = nombreOffres(atelier)

  return (
    <Link
      to={`/createur/${atelier.slug}`}
      className="block overflow-hidden rounded-2xl border border-ligne bg-blanc"
    >
      {/* Cadre carré : c'est le format dans lequel les créateurs photographient
          déjà, parce que c'est celui d'Instagram. Un cadre paysage rognerait le
          haut et le bas de chaque photo — et sur un t-shirt, c'est exactement
          là que se trouve le motif.

          Sans photo, on ne réserve pas la place : un grand carré hachuré
          occuperait tout l'écran pour ne rien montrer. La carte se réduit à son
          identité, et l'écart avec une fiche illustrée se voit — ce qui est la
          meilleure incitation à envoyer des photos. */}
      {photo && (
        <div className="aspect-square w-full">
          <Photo
            chemin={photo.storage_path}
            alt={photo.alt_text ?? atelier.display_name}
            source="atelier"
            className="size-full"
          />
        </div>
      )}

      <div className="flex items-start gap-3 p-3">
        <Monogramme nom={atelier.display_name} logoUrl={atelier.logo_url} />

        <div className="min-w-0 flex-1">
          <h2 className="text-base leading-tight font-bold text-encre">
            {atelier.display_name}
            {atelier.is_verified && <Verifie />}
          </h2>
          <p className="truncate text-sm text-second">
            {metier(atelier.vendor_type)} · {lieu}
          </p>

          {atelier.tagline && (
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-second">{atelier.tagline}</p>
          )}

          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3">
            {atelier.price_from_cfa !== null && (
              <p className="font-action text-sm font-bold text-accent">
                À partir de {montant(atelier.price_from_cfa)}
              </p>
            )}
            {pieces > 0 && (
              <p className="font-action text-xs text-second">
                {pieces} pièce{pieces > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

/** Le badge « Vérifié », collé au dernier mot du nom pour ne pas flotter seul. */
function Verifie() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="ml-1 inline-block size-4 shrink-0 -translate-y-px align-middle fill-accent"
      role="img"
      aria-label="Créateur vérifié"
    >
      <path d="M10 1.5 12 3.6l2.9-.3.6 2.9 2.5 1.5-1.3 2.6 1.3 2.6-2.5 1.5-.6 2.9-2.9-.3L10 18.5 8 16.4l-2.9.3-.6-2.9-2.5-1.5 1.3-2.6L2 7.1l2.5-1.5.6-2.9 2.9.3z" />
      <path d="m8.9 12.7-2.6-2.6 1.1-1.1 1.5 1.5 3.7-3.7 1.1 1.1z" className="fill-blanc" />
    </svg>
  )
}
