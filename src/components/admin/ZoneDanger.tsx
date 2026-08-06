import { useState } from 'react'

/**
 * Le bloc de suppression, en bas des formulaires.
 *
 * Trois précautions, chacune contre une façon différente de se tromper :
 *
 *  1. Il est en bas de page, à l'écart des boutons qu'on utilise tous les
 *     jours. On ne supprime pas en visant « Enregistrer ».
 *  2. Il demande confirmation dans une fenêtre qui NOMME ce qui disparaît et
 *     ÉNUMÈRE ce qui part avec. Un « êtes-vous sûr ? » ne renseigne sur rien.
 *  3. Le bouton de confirmation est le seul en rouge de toute l'interface.
 *
 * Ce n'est pas de la décoration : sur un téléphone, le pouce se pose souvent
 * à côté de ce qu'il vise.
 */
export function ZoneDanger({
  titre,
  nom,
  consequences,
  avertissement,
  enCours,
  erreur,
  onSupprimer,
}: {
  titre: string
  /** Le nom exact de ce qui sera supprimé, répété dans la confirmation. */
  nom: string
  /** Ce qui disparaît avec, en clair. Une ligne par conséquence. */
  consequences: string[]
  /** Une phrase de plus, quand le cas le mérite. */
  avertissement?: string
  enCours: boolean
  erreur?: string | null
  onSupprimer: () => void
}) {
  const [ouvert, setOuvert] = useState(false)

  return (
    <section className="mt-10 rounded-2xl border border-accent/30 bg-accent/5 p-4">
      <h2 className="font-action text-xs font-bold tracking-widest text-accent uppercase">
        Suppression définitive
      </h2>
      <p className="mt-1 text-sm text-second">
        Cette action ne se défait pas. Pour retirer une fiche du site sans la perdre, préférez la
        masquer ou l'archiver.
      </p>

      <button
        type="button"
        onClick={() => setOuvert(true)}
        disabled={enCours}
        className="mt-3 rounded-full border border-accent px-4 py-2 font-action text-sm font-semibold text-accent disabled:opacity-50"
      >
        {titre}
      </button>

      {erreur && (
        <p className="mt-3 rounded-xl border border-accent/40 bg-blanc p-3 text-sm text-encre">
          {erreur}
        </p>
      )}

      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            className="absolute inset-0 bg-encre/50"
            onClick={() => setOuvert(false)}
            aria-label="Annuler"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-t-3xl bg-creme p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
          >
            <h3 className="text-lg font-bold text-encre">Supprimer « {nom} » ?</h3>

            <p className="mt-2 text-sm text-second">Ceci sera effacé définitivement :</p>
            <ul className="mt-2 space-y-1">
              {consequences.map((c) => (
                <li key={c} className="flex gap-2 text-sm text-encre">
                  <span aria-hidden="true" className="text-accent">
                    ·
                  </span>
                  {c}
                </li>
              ))}
            </ul>

            {avertissement && <p className="mt-3 text-sm text-second">{avertissement}</p>}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setOuvert(false)}
                className="flex-1 rounded-full border border-ligne bg-blanc px-5 py-3 font-action font-semibold text-encre"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setOuvert(false)
                  onSupprimer()
                }}
                className="flex-1 rounded-full bg-accent px-5 py-3 font-action font-bold text-blanc"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
