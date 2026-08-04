import { useEffect, useState } from 'react'

/**
 * Le champ de recherche.
 *
 * Le texte n'est pas envoyé à chaque lettre : on attend 300 ms d'immobilité.
 * Sans cela, taper « karité » déclencherait six requêtes, dont cinq inutiles —
 * et sur une 3G instable elles peuvent revenir dans le désordre, faisant
 * clignoter les résultats.
 */
export function BarreRecherche({
  valeur,
  onChange,
  autoFocus = false,
}: {
  valeur: string
  onChange: (v: string) => void
  autoFocus?: boolean
}) {
  const [saisie, setSaisie] = useState(valeur)

  // Le parent peut changer la valeur (retour arrière du navigateur, effacement
  // d'une pastille) : on se resynchronise.
  useEffect(() => setSaisie(valeur), [valeur])

  useEffect(() => {
    if (saisie === valeur) return
    const minuteur = setTimeout(() => onChange(saisie), 300)
    return () => clearTimeout(minuteur)
  }, [saisie, valeur, onChange])

  return (
    <div className="relative">
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 fill-none stroke-second stroke-2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>

      <input
        type="search"
        inputMode="search"
        autoFocus={autoFocus}
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        placeholder="Chercher un objet, un créateur…"
        aria-label="Chercher un objet ou un créateur"
        className="h-12 w-full rounded-full border border-ligne bg-blanc pr-11 pl-11 text-encre placeholder:text-second"
      />

      {saisie && (
        <button
          onClick={() => {
            setSaisie('')
            onChange('')
          }}
          aria-label="Effacer la recherche"
          className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-2xl leading-none text-accent"
        >
          ×
        </button>
      )}
    </div>
  )
}
