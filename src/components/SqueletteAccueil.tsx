/**
 * Le squelette de chargement de l'accueil.
 *
 * Il reprend exactement la mise en page réelle — même hauteurs, mêmes
 * espacements. C'est ce qui évite que la page « saute » quand les données
 * arrivent, ce qui est désagréable partout et franchement pénible sur une
 * connexion lente où l'attente dure plusieurs secondes.
 *
 * Jamais de roue qui tourne : elle n'annonce rien et donne l'impression que
 * l'application est bloquée.
 */
export function SqueletteAccueil() {
  return (
    <div aria-hidden="true" className="space-y-8">
      {[0, 1, 2].map((i) => (
        <section key={i}>
          <div className="flex items-center gap-3 px-5">
            <div className="shimmer size-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="shimmer h-4 w-2/5 rounded" />
              <div className="shimmer h-3 w-1/4 rounded" />
            </div>
            <div className="shimmer h-9 w-24 rounded-full" />
          </div>

          <div className="mt-3 flex gap-3 overflow-hidden px-5">
            {[0, 1, 2].map((j) => (
              <div key={j} className="w-36 shrink-0">
                <div className="shimmer aspect-square rounded-xl" />
                <div className="shimmer mt-2 h-4 w-full rounded" />
                <div className="shimmer mt-1.5 h-4 w-2/3 rounded" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
