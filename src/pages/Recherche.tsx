import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useRecherche, compterFiltres, FILTRES_VIDES } from '@/hooks/useRecherche'
import type { Filtres, Dispo, Tri } from '@/hooks/useRecherche'
import { useCategories } from '@/hooks/useCategories'
import { BarreRecherche } from '@/components/BarreRecherche'
import { FeuilleFiltres } from '@/components/FeuilleFiltres'
import { CarteObjet } from '@/components/CarteObjet'
import { montant } from '@/lib/format'
import { trackEvent } from '@/lib/analytics'

/**
 * Les résultats de recherche.
 *
 * L'état vit dans l'adresse de la page, pas dans le composant. Trois raisons :
 * le bouton « retour » du téléphone refait ce qu'on attend, une recherche peut
 * se partager telle quelle dans WhatsApp, et un rechargement ne perd rien.
 */
export default function Recherche() {
  const [params, setParams] = useSearchParams()
  const [feuilleOuverte, setFeuilleOuverte] = useState(false)
  const { data: categories } = useCategories()

  const filtres: Filtres = useMemo(
    () => ({
      q: params.get('q') ?? '',
      categorie: params.get('cat'),
      dispo: (params.get('dispo') as Dispo) ?? 'tout',
      personnalisable: params.get('perso') === '1',
      prixMax: params.get('pmax') ? Number(params.get('pmax')) : null,
      tri: (params.get('tri') as Tri) ?? 'recent',
    }),
    [params],
  )

  const appliquer = useCallback(
    (f: Filtres) => {
      const p = new URLSearchParams()
      if (f.q) p.set('q', f.q)
      if (f.categorie) p.set('cat', f.categorie)
      if (f.dispo !== 'tout') p.set('dispo', f.dispo)
      if (f.personnalisable) p.set('perso', '1')
      if (f.prixMax !== null) p.set('pmax', String(f.prixMax))
      if (f.tri !== 'recent') p.set('tri', f.tri)
      setParams(p, { replace: true })
    },
    [setParams],
  )

  const { data: resultats, isPending, isError, refetch } = useRecherche(filtres)

  // Une recherche validée est un événement : elle dit ce que les gens
  // cherchent et ne trouvent pas. C'est la première source d'idées pour savoir
  // quels créateurs recruter ensuite.
  useEffect(() => {
    const terme = filtres.q.trim()
    if (!terme) return
    const minuteur = setTimeout(
      () =>
        trackEvent('search', {
          metadata: { terme, resultats: resultats?.length ?? null },
        }),
      800,
    )
    return () => clearTimeout(minuteur)
  }, [filtres.q, resultats?.length])

  const nbFiltres = compterFiltres(filtres)
  const nomCategorie = categories?.find((c) => c.id === filtres.categorie)?.name

  return (
    <main className="mx-auto min-h-dvh max-w-2xl pb-16">
      <div className="sticky top-0 z-10 bg-creme/95 px-4 pt-3 pb-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            aria-label="Revenir aux ateliers"
            className="flex size-11 shrink-0 items-center justify-center text-encre"
          >
            <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-2">
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="flex-1">
            <BarreRecherche
              valeur={filtres.q}
              onChange={(q) => appliquer({ ...filtres, q })}
              autoFocus
            />
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFeuilleOuverte(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-encre bg-blanc px-4 font-action text-sm font-semibold text-encre"
          >
            Filtres
            {nbFiltres > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-encre text-[11px] text-blanc">
                {nbFiltres}
              </span>
            )}
          </button>

          {/* Chaque filtre actif est retirable d'un geste. Un filtre qu'on ne
              voit pas est un filtre dont on oublie l'existence, et on croit
              ensuite que le catalogue est vide. */}
          {nomCategorie && (
            <PastilleActive onRetirer={() => appliquer({ ...filtres, categorie: null })}>
              {nomCategorie}
            </PastilleActive>
          )}
          {filtres.dispo !== 'tout' && (
            <PastilleActive onRetirer={() => appliquer({ ...filtres, dispo: 'tout' })}>
              {filtres.dispo === 'disponible' ? 'Disponible' : 'Sur commande'}
            </PastilleActive>
          )}
          {filtres.personnalisable && (
            <PastilleActive onRetirer={() => appliquer({ ...filtres, personnalisable: false })}>
              Personnalisable
            </PastilleActive>
          )}
          {filtres.prixMax !== null && (
            <PastilleActive onRetirer={() => appliquer({ ...filtres, prixMax: null })}>
              Moins de {montant(filtres.prixMax)}
            </PastilleActive>
          )}
        </div>
      </div>

      <div className="px-4">
        {resultats && resultats.length > 0 && (
          <p className="py-2 font-action text-sm text-second">
            {resultats.length} objet{resultats.length > 1 ? 's' : ''}
          </p>
        )}

        {isPending && <SqueletteGrille />}

        {isError && (
          <div className="mt-8 rounded-2xl border border-ligne bg-blanc p-6 text-center">
            <p className="font-bold text-encre">La recherche n'a pas abouti</p>
            <p className="mt-1 text-sm text-second">Votre connexion est peut-être interrompue.</p>
            <button
              onClick={() => void refetch()}
              className="mt-4 rounded-full bg-encre px-6 font-action font-semibold text-blanc"
            >
              Réessayer
            </button>
          </div>
        )}

        {resultats && resultats.length === 0 && (
          <Vide filtres={filtres} onEffacer={() => appliquer(FILTRES_VIDES)} />
        )}

        {resultats && resultats.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5">
            {resultats.map((o) => (
              <CarteObjet key={o.id} offre={o} />
            ))}
          </div>
        )}
      </div>

      {feuilleOuverte && (
        <FeuilleFiltres
          filtres={filtres}
          nbResultats={resultats?.length ?? 0}
          onFermer={() => setFeuilleOuverte(false)}
          onValider={(f) => {
            appliquer(f)
            setFeuilleOuverte(false)
          }}
        />
      )}
    </main>
  )
}

function PastilleActive({
  children,
  onRetirer,
}: {
  children: React.ReactNode
  onRetirer: () => void
}) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-encre py-1.5 pr-2 pl-3.5 font-action text-sm font-semibold text-blanc">
      {children}
      <button
        onClick={onRetirer}
        aria-label={`Retirer le filtre`}
        className="flex size-5 items-center justify-center rounded-full text-base leading-none"
      >
        ×
      </button>
    </span>
  )
}

/**
 * L'écran vide propose toujours une sortie.
 *
 * Il nomme le terme cherché — sinon on doute d'avoir bien tapé — et il donne
 * la cause probable plutôt qu'un « aucun résultat » qui laisse démuni.
 */
function Vide({ filtres, onEffacer }: { filtres: Filtres; onEffacer: () => void }) {
  const { data: categories } = useCategories()
  const aDesFiltres = compterFiltres(filtres) > 0

  return (
    <div className="mt-6 text-center">
      <h2 className="text-xl leading-snug font-bold text-encre">
        {filtres.q ? (
          <>
            Aucun objet pour
            <br />« {filtres.q} »
          </>
        ) : (
          'Aucun objet avec ces filtres'
        )}
      </h2>

      <p className="mx-auto mt-2 max-w-xs text-second">
        {aDesFiltres
          ? 'Vos filtres sont peut-être trop serrés. Essayez de les retirer.'
          : "Personne ne fabrique encore ça ici. Essayez un mot plus large, ou parcourez une catégorie."}
      </p>

      <button
        onClick={onEffacer}
        className="mt-5 rounded-full bg-encre px-6 font-action font-semibold text-blanc"
      >
        Tout effacer
      </button>

      <h3 className="mt-10 font-action text-xs font-bold tracking-widest text-second uppercase">
        Parcourir plutôt
      </h3>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {categories?.slice(0, 6).map((c) => (
          <Link
            key={c.id}
            to={`/recherche?cat=${c.id}`}
            onClick={() => trackEvent('category_view', { metadata: { categorie: c.slug } })}
            className="flex items-center rounded-full border border-ligne bg-blanc px-4 font-action text-sm font-semibold text-encre"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

function SqueletteGrille() {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-x-3 gap-y-5">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i}>
          <div className="shimmer aspect-square rounded-xl" />
          <div className="shimmer mt-2 h-4 w-full rounded" />
          <div className="shimmer mt-1.5 h-3 w-2/3 rounded" />
          <div className="shimmer mt-2 h-7 w-28 rounded-full" />
        </div>
      ))}
    </div>
  )
}
