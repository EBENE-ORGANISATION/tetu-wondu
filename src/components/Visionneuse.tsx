import { useEffect, useRef, useState } from 'react'
import { urlImage, urlImageAtelier } from '@/lib/images'

/**
 * La photo en grand, plein écran.
 *
 * En phase 1, la photo n'illustre pas le produit : elle EST le produit. Un
 * visiteur qui veut juger le tissage d'un pagne ou le grain d'une poterie doit
 * pouvoir la regarder en entier, pas dans une vignette de trois centimètres.
 *
 * Choix d'implémentation, tous dictés par le téléphone d'entrée de gamme visé :
 *
 *  - fond sombre plutôt que blanc : en plein soleil, un fond clair renvoie la
 *    lumière et masque justement les détails qu'on est venu voir ;
 *  - `pinch-zoom` laissé au navigateur : sa gestion native est plus fluide que
 *    tout ce qu'on pourrait recoder, et les gens la connaissent déjà ;
 *  - glissement horizontal pour changer de photo, geste attendu partout ;
 *  - aucune bibliothèque : une visionneuse pèse entre 15 et 40 Ko, celle-ci
 *    en pèse moins d'un.
 */
export function Visionneuse({
  photos,
  depart = 0,
  source = 'offre',
  legende,
  onFermer,
}: {
  photos: { storage_path: string; alt_text?: string | null }[]
  depart?: number
  source?: 'offre' | 'atelier'
  /** Le nom de l'atelier ou de l'objet, rappelé en bas. */
  legende?: string
  onFermer: () => void
}) {
  const [index, setIndex] = useState(depart)
  const departX = useRef<number | null>(null)
  const adresse = source === 'atelier' ? urlImageAtelier : urlImage

  const suivante = () => setIndex((i) => (i + 1) % photos.length)
  const precedente = () => setIndex((i) => (i - 1 + photos.length) % photos.length)

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
      if (e.key === 'ArrowRight') suivante()
      if (e.key === 'ArrowLeft') precedente()
    }
    document.addEventListener('keydown', auClavier)

    // Sans cela, la page continue de défiler derrière la visionneuse et on
    // ressort à un endroit qu'on n'a pas choisi.
    const defilement = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', auClavier)
      document.body.style.overflow = defilement
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length])

  if (photos.length === 0) return null
  const photo = photos[index]!

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-encre"
      role="dialog"
      aria-modal="true"
      aria-label="Photo en grand"
      onTouchStart={(e) => {
        departX.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        if (departX.current === null || photos.length < 2) return
        const ecart = (e.changedTouches[0]?.clientX ?? 0) - departX.current
        // 50 px : assez pour distinguer un glissement d'un doigt qui tremble.
        if (ecart > 50) precedente()
        else if (ecart < -50) suivante()
        departX.current = null
      }}
    >
      <div className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="font-action text-sm text-blanc/70">
          {photos.length > 1 ? `${index + 1} / ${photos.length}` : ''}
        </span>
        <button
          onClick={onFermer}
          aria-label="Fermer"
          className="flex size-11 items-center justify-center rounded-full text-3xl leading-none text-blanc"
        >
          ×
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-2">
        <img
          key={photo.storage_path}
          src={adresse(photo.storage_path)}
          alt={photo.alt_text ?? legende ?? ''}
          className="max-h-full max-w-full object-contain"
          style={{ touchAction: 'pinch-zoom' }}
        />
      </div>

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {legende && <p className="text-center text-sm text-blanc/80">{legende}</p>}
        <p className="mt-1 text-center text-xs text-blanc/50">
          {photos.length > 1 ? 'Glissez pour voir les autres · ' : ''}Pincez pour agrandir
        </p>
      </div>

      {/* Flèches pour l'ordinateur et pour ceux qui ne devinent pas le
          glissement. Cachées quand il n'y a qu'une photo. */}
      {photos.length > 1 && (
        <>
          <Fleche cote="gauche" onClick={precedente} />
          <Fleche cote="droite" onClick={suivante} />
        </>
      )}
    </div>
  )
}

function Fleche({ cote, onClick }: { cote: 'gauche' | 'droite'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={cote === 'gauche' ? 'Photo précédente' : 'Photo suivante'}
      className={`absolute top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-blanc/10 text-blanc ${
        cote === 'gauche' ? 'left-2' : 'right-2'
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-2">
        <path
          d={cote === 'gauche' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
