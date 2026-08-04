import { Link } from 'react-router-dom'
import { useAteliers } from '@/hooks/useAteliers'
import { useCategories } from '@/hooks/useCategories'
import { Monogramme } from '@/components/Monogramme'
import { VignetteObjet } from '@/components/VignetteObjet'
import { SqueletteAccueil } from '@/components/SqueletteAccueil'
import { metier } from '@/lib/format'
import { lienAtelier } from '@/lib/whatsapp'
import { trackEvent } from '@/lib/analytics'
import type { AtelierAvecOffres } from '@/types/database'

const NOM_APP = import.meta.env.VITE_APP_NAME || 'Annuaire'

/**
 * L'accueil « Ateliers ».
 *
 * On entre par le créateur, pas par l'objet. C'est la première des trois
 * décisions structurantes du projet : ce qui relie une savonnière de Kara et
 * un imprimeur de Lomé, ce n'est pas la catégorie, c'est la personne. Un
 * client qui a aimé un objet revient vers son auteur.
 */
export default function Accueil() {
  const { data: ateliers, isPending, isError, refetch } = useAteliers()

  return (
    <main className="mx-auto min-h-dvh max-w-2xl pb-16">
      <header className="px-5 pt-6 pb-5">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-encre">{NOM_APP}</h1>
          {ateliers && (
            <p className="shrink-0 font-action text-sm text-second">
              {ateliers.length} atelier{ateliers.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <p className="mt-1 text-second">Choisissez d'abord un créateur</p>

        {/* Une fausse barre de recherche qui mène à l'écran dédié, plutôt qu'un
            champ actif ici. C'est le comportement attendu sur téléphone : le
            clavier s'ouvre sur un écran fait pour lui, pas au milieu d'une
            liste qu'il recouvre à moitié. */}
        <Link
          to="/recherche"
          className="mt-4 flex h-12 items-center gap-3 rounded-full border border-ligne bg-blanc px-4 text-second"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5 shrink-0 fill-none stroke-current stroke-2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          Chercher un objet, un créateur…
        </Link>
      </header>

      <Categories />

      {isPending && <SqueletteAccueil />}

      {isError && <Erreur onReessayer={() => void refetch()} />}

      {ateliers && ateliers.length === 0 && <Vide />}

      {ateliers && ateliers.length > 0 && (
        <div className="space-y-8">
          {ateliers.map((atelier) => (
            <SectionAtelier key={atelier.id} atelier={atelier} />
          ))}
        </div>
      )}
    </main>
  )
}

/** Les catégories en pastilles défilables, sous l'en-tête. */
function Categories() {
  const { data: categories } = useCategories()
  if (!categories?.length) return null

  return (
    <nav aria-label="Catégories" className="scroll-x mb-7 flex gap-2 px-5">
      {categories.map((c) => (
        <Link
          key={c.id}
          to={`/recherche?cat=${c.id}`}
          onClick={() => trackEvent('category_view', { metadata: { categorie: c.slug } })}
          className="flex shrink-0 items-center rounded-full border border-ligne bg-blanc px-4 font-action text-sm font-semibold text-encre"
        >
          {c.name}
        </Link>
      ))}
    </nav>
  )
}

function SectionAtelier({ atelier }: { atelier: AtelierAvecOffres }) {
  const lieu = atelier.neighborhood ? `${atelier.city}, ${atelier.neighborhood}` : atelier.city

  function contacter() {
    // Non bloquant : on n'attend pas la confirmation avant d'ouvrir WhatsApp.
    trackEvent('whatsapp_click', {
      vendor_id: atelier.id,
      metadata: { depuis: 'accueil' },
    })
  }

  return (
    <section>
      <div className="flex items-center gap-3 px-5">
        <Link to={`/createur/${atelier.slug}`} className="shrink-0">
          <Monogramme nom={atelier.display_name} logoUrl={atelier.logo_url} />
        </Link>

        <div className="min-w-0 flex-1">
          <Link to={`/createur/${atelier.slug}`} className="block">
            {/* Le nom passe à la ligne plutôt que d'être coupé : « Atelier
                Tissage Nots… » fait douter de la fiche. */}
            <h2 className="text-base leading-tight font-bold text-encre">
              <NomAvecBadge nom={atelier.display_name} verifie={atelier.is_verified} />
            </h2>
            <p className="mt-0.5 truncate text-sm text-second">
              {metier(atelier.vendor_type)} · {lieu}
            </p>
          </Link>
        </div>

        <a
          href={lienAtelier({
            whatsapp_number: atelier.whatsapp_number,
            nom: atelier.display_name,
            slug: atelier.slug,
          })}
          target="_blank"
          rel="noopener noreferrer"
          onClick={contacter}
          className="flex shrink-0 items-center rounded-full border border-accent px-4 font-action text-sm font-semibold text-accent"
        >
          Contacter
        </a>
      </div>

      <div className="scroll-x mt-3 flex gap-3 px-5">
        {atelier.offers.map((offre) => (
          <VignetteObjet key={offre.id} offre={offre} />
        ))}
      </div>
    </section>
  )
}

/**
 * Le nom de l'atelier, avec son badge « Vérifié » collé au dernier mot.
 *
 * Sans cette précaution, sur un nom qui remplit la ligne, le badge part seul
 * sur la ligne suivante — et un badge de confiance flottant dans le vide fait
 * l'effet inverse de celui recherché.
 */
function NomAvecBadge({ nom, verifie }: { nom: string; verifie: boolean }) {
  if (!verifie) return <>{nom}</>

  const mots = nom.split(' ')
  const dernier = mots.pop() ?? nom
  const debut = mots.join(' ')

  return (
    <>
      {debut && `${debut} `}
      <span className="whitespace-nowrap">
        {dernier}
        <Verifie />
      </span>
    </>
  )
}

/** Le badge « Vérifié » : le principal signal de confiance de la plateforme. */
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

function Erreur({ onReessayer }: { onReessayer: () => void }) {
  return (
    <div className="mx-5 rounded-2xl border border-ligne bg-blanc p-6 text-center">
      <p className="font-bold text-encre">Impossible de charger les ateliers</p>
      <p className="mt-1 text-sm text-second">
        Votre connexion est peut-être interrompue. Rien n'est perdu.
      </p>
      <button
        onClick={onReessayer}
        className="mt-4 rounded-full bg-encre px-6 font-action font-semibold text-blanc"
      >
        Réessayer
      </button>
    </div>
  )
}

function Vide() {
  return (
    <div className="mx-5 rounded-2xl border border-ligne bg-blanc p-6 text-center">
      <p className="font-bold text-encre">Aucun atelier pour le moment</p>
      <p className="mt-1 text-sm text-second">
        Les premières fiches arrivent. Revenez dans quelques jours.
      </p>
    </div>
  )
}
