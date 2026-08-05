import { useQueryClient } from '@tanstack/react-query'
import { useEnLigne } from '@/hooks/useEnLigne'

/**
 * Le bandeau affiché quand le réseau tombe.
 *
 * Le principe : on ne cache rien et on n'efface rien. Le visiteur garde sous
 * les yeux ce qui avait déjà été chargé, et on lui dit franchement que ce
 * n'est peut-être plus à jour. Une page blanche assortie d'un « erreur
 * réseau » serait plus honnête techniquement et beaucoup plus décourageante.
 *
 * Une seule action proposée : réessayer. Pas trois boutons pour quelqu'un qui
 * est déjà contrarié.
 */
export function BandeauHorsLigne() {
  const enLigne = useEnLigne()
  const client = useQueryClient()

  if (enLigne) return null

  // En flux normal, pas en position collée : plusieurs écrans ont déjà leur
  // propre en-tête collé en haut, et deux éléments collés au même endroit se
  // recouvrent. Le bandeau glisse donc avec la page.
  return (
    <div role="status" className="border-b border-commande/30 bg-commande/10 px-4 py-2.5">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <span className="size-2 shrink-0 rounded-full bg-commande" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm leading-snug text-encre">
          <span className="font-bold">Pas de connexion.</span> Voici ce qui est enregistré sur
          votre téléphone.
        </p>
        <button
          onClick={() => void client.refetchQueries()}
          className="shrink-0 rounded-full border border-commande px-3 py-1.5 font-action text-xs font-semibold text-encre"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
