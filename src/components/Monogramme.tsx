import { monogramme } from '@/lib/format'

/**
 * L'identité visuelle d'un atelier tant qu'il n'a pas de logo.
 *
 * Deux lettres sur un carré sombre : lisible en plein soleil, et surtout
 * reconnaissable d'une visite à l'autre — c'est ce qui fait qu'un client
 * retrouve « son » créateur dans une liste.
 */
export function Monogramme({
  nom,
  logoUrl,
  taille = 'md',
}: {
  nom: string
  logoUrl?: string | null
  taille?: 'md' | 'lg'
}) {
  const dimensions = taille === 'lg' ? 'size-16 text-xl rounded-2xl' : 'size-12 text-sm rounded-xl'

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className={`${dimensions} shrink-0 border border-ligne object-cover`}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={`${dimensions} flex shrink-0 items-center justify-center bg-encre font-action font-bold tracking-wide text-blanc`}
    >
      {monogramme(nom)}
    </div>
  )
}
