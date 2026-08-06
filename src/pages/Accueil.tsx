import { useMemo, useState } from 'react'
import { useAteliers } from '@/hooks/useAteliers'
import { CarteAtelier } from '@/components/CarteAtelier'
import { BarreRecherche } from '@/components/BarreRecherche'
import { trackEvent } from '@/lib/analytics'
import { normaliser } from '@/lib/texte'
import type { AtelierCarte } from '@/types/database'

const NOM_APP = import.meta.env.VITE_APP_NAME || 'Annuaire'

/**
 * L'accueil de la phase 1 : la liste des ateliers.
 *
 * On entre par la marque, pas par l'objet. C'est la première des trois
 * décisions structurantes du projet, poussée jusqu'au bout : ce qui relie une
 * savonnière de Kara et un imprimeur de Lomé, ce n'est pas la catégorie, c'est
 * la personne.
 *
 * Le filtrage se fait ici, dans le téléphone, et non par une requête à chaque
 * lettre tapée. À l'échelle d'un annuaire d'ateliers — quelques dizaines, pas
 * quelques milliers — c'est instantané, ça ne consomme rien, et surtout ça
 * continue de fonctionner sans réseau.
 */
export default function Accueil() {
  const { data: ateliers, isPending, isError, refetch } = useAteliers()
  const [recherche, setRecherche] = useState('')
  const [ville, setVille] = useState<string | null>(null)

  const villes = useMemo(() => {
    const compte = new Map<string, number>()
    for (const a of ateliers ?? []) compte.set(a.city, (compte.get(a.city) ?? 0) + 1)
    return [...compte.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
  }, [ateliers])

  const visibles = useMemo(() => {
    const terme = normaliser(recherche.trim())
    return (ateliers ?? []).filter((a) => {
      if (ville && a.city !== ville) return false
      if (!terme) return true
      const matiere = normaliser(
        [a.display_name, a.tagline, a.city, a.neighborhood].filter(Boolean).join(' '),
      )
      return matiere.includes(terme)
    })
  }, [ateliers, recherche, ville])

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 pb-16">
      <header className="pt-6 pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-encre">{NOM_APP}</h1>
          {ateliers && (
            <p className="shrink-0 font-action text-sm text-second">
              {ateliers.length} atelier{ateliers.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <p className="mt-1 text-second">Les créateurs et fabricants du Togo</p>

        <div className="mt-4">
          <BarreRecherche
            valeur={recherche}
            onChange={(v) => {
              setRecherche(v)
              // On n'enregistre que les recherches un peu sérieuses : compter
              // chaque lettre effacée ne dirait rien d'utile.
              if (v.trim().length >= 3) {
                trackEvent('search', {
                  metadata: { terme: v.trim(), resultats: visibles.length },
                })
              }
            }}
          />
        </div>
      </header>

      {villes.length > 1 && (
        <nav aria-label="Villes" className="scroll-x -mx-4 mb-5 flex gap-2 px-4">
          <Pastille actif={ville === null} onClick={() => setVille(null)}>
            Toutes les villes
          </Pastille>
          {villes.map(([nom, n]) => (
            <Pastille key={nom} actif={ville === nom} onClick={() => setVille(nom)}>
              {nom} <span className="opacity-60">{n}</span>
            </Pastille>
          ))}
        </nav>
      )}

      {isPending && <Squelette />}

      {isError && (
        <div className="rounded-2xl border border-ligne bg-blanc p-6 text-center">
          <p className="font-bold text-encre">Impossible de charger les ateliers</p>
          <p className="mt-1 text-sm text-second">
            Votre connexion est peut-être interrompue. Rien n'est perdu.
          </p>
          <button
            onClick={() => void refetch()}
            className="mt-4 rounded-full bg-encre px-6 font-action font-semibold text-blanc"
          >
            Réessayer
          </button>
        </div>
      )}

      {ateliers && visibles.length === 0 && (
        <Vide
          terme={recherche.trim()}
          filtre={ville}
          onEffacer={() => {
            setRecherche('')
            setVille(null)
          }}
        />
      )}

      {/* Une colonne sur téléphone : la photo carrée occupe la largeur, c'est
          ce qui donne envie d'entrer. Deux colonnes dès qu'il y a la place,
          sinon la liste devient interminable sur grand écran. */}
      {visibles.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visibles.map((a: AtelierCarte) => (
            <CarteAtelier key={a.id} atelier={a} />
          ))}
        </div>
      )}
    </main>
  )
}

function Pastille({
  actif,
  onClick,
  children,
}: {
  actif: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={actif}
      className={`shrink-0 rounded-full border px-4 font-action text-sm font-semibold ${
        actif ? 'border-encre bg-encre text-blanc' : 'border-ligne bg-blanc text-encre'
      }`}
    >
      {children}
    </button>
  )
}

function Vide({
  terme,
  filtre,
  onEffacer,
}: {
  terme: string
  filtre: string | null
  onEffacer: () => void
}) {
  return (
    <div className="rounded-2xl border border-ligne bg-blanc p-6 text-center">
      <p className="font-bold text-encre">
        {terme ? <>Aucun atelier pour « {terme} »</> : 'Aucun atelier ici pour le moment'}
      </p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-second">
        {filtre
          ? `Personne n'est encore référencé à ${filtre}. Essayez une autre ville.`
          : "Essayez un mot plus large, ou parcourez toutes les villes."}
      </p>
      <button
        onClick={onEffacer}
        className="mt-4 rounded-full bg-encre px-6 font-action font-semibold text-blanc"
      >
        Tout afficher
      </button>
    </div>
  )
}

function Squelette() {
  return (
    <div aria-hidden="true" className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-ligne bg-blanc">
          <div className="shimmer aspect-[5/3] w-full" />
          <div className="flex gap-3 p-3">
            <div className="shimmer size-12 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="shimmer h-4 w-2/5 rounded" />
              <div className="shimmer h-3 w-1/3 rounded" />
              <div className="shimmer h-3 w-3/4 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
