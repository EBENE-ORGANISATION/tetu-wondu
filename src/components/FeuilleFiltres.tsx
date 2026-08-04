import { useState } from 'react'
import { useCategories, usePrixMax } from '@/hooks/useCategories'
import { montant } from '@/lib/format'
import type { Filtres, Dispo, Tri } from '@/hooks/useRecherche'
import { FILTRES_VIDES } from '@/hooks/useRecherche'

/**
 * La feuille de filtres, qui monte depuis le bas.
 *
 * Gros boutons, vocabulaire du catalogue plutôt que jargon : « Disponible » et
 * « Sur commande » sont les mots que le visiteur a déjà vus sur les cartes.
 * Rien n'est appliqué tant qu'on n'a pas validé — on peut donc essayer sans
 * risque, ce qui compte quand chaque requête coûte plusieurs secondes.
 */
export function FeuilleFiltres({
  filtres,
  nbResultats,
  onValider,
  onFermer,
}: {
  filtres: Filtres
  nbResultats: number
  onValider: (f: Filtres) => void
  onFermer: () => void
}) {
  const [brouillon, setBrouillon] = useState<Filtres>(filtres)
  const { data: categories } = useCategories()
  const { data: prixMax = 50000 } = usePrixMax()

  const modifier = (bout: Partial<Filtres>) => setBrouillon((f) => ({ ...f, ...bout }))

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button
        className="absolute inset-0 bg-encre/40"
        onClick={onFermer}
        aria-label="Fermer les filtres"
      />

      <div className="relative max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-creme pb-[env(safe-area-inset-bottom)]">
        <div className="sticky top-0 flex items-center justify-between bg-creme px-5 pt-5 pb-3">
          <h2 className="text-xl font-bold text-encre">Filtres</h2>
          <button
            onClick={() => setBrouillon({ ...FILTRES_VIDES, q: brouillon.q })}
            className="font-action text-sm font-semibold text-accent"
          >
            Réinitialiser
          </button>
        </div>

        <div className="space-y-6 px-5 pb-4">
          <Groupe titre="Catégorie">
            <div className="flex flex-wrap gap-2">
              <Pastille
                actif={brouillon.categorie === null}
                onClick={() => modifier({ categorie: null })}
              >
                Toutes
              </Pastille>
              {categories?.map((c) => (
                <Pastille
                  key={c.id}
                  actif={brouillon.categorie === c.id}
                  onClick={() => modifier({ categorie: c.id })}
                >
                  {c.name}
                </Pastille>
              ))}
            </div>
          </Groupe>

          <Groupe titre="Disponibilité">
            <div className="flex gap-2">
              {(
                [
                  ['tout', 'Tout'],
                  ['disponible', 'Disponible'],
                  ['commande', 'Sur commande'],
                ] as [Dispo, string][]
              ).map(([valeur, libelle]) => (
                <Pastille
                  key={valeur}
                  actif={brouillon.dispo === valeur}
                  onClick={() => modifier({ dispo: valeur })}
                >
                  {libelle}
                </Pastille>
              ))}
            </div>
          </Groupe>

          <Groupe titre="Options">
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-ligne bg-blanc px-4 py-3">
              <span className="text-encre">Personnalisable uniquement</span>
              <input
                type="checkbox"
                checked={brouillon.personnalisable}
                onChange={(e) => modifier({ personnalisable: e.target.checked })}
                className="size-6 shrink-0 accent-[var(--color-accent)]"
              />
            </label>
          </Groupe>

          <Groupe titre="Prix maximum">
            <p className="font-action text-lg font-bold text-encre">
              {brouillon.prixMax === null ? 'Aucune limite' : `Jusqu'à ${montant(brouillon.prixMax)}`}
            </p>
            <input
              type="range"
              min={1000}
              max={prixMax}
              step={500}
              value={brouillon.prixMax ?? prixMax}
              onChange={(e) => modifier({ prixMax: Number(e.target.value) })}
              className="mt-2 w-full accent-[var(--color-accent)]"
              aria-label="Prix maximum"
            />
            <div className="flex justify-between font-action text-xs text-second">
              <span>{montant(1000)}</span>
              <span>{montant(prixMax)}</span>
            </div>
            <p className="mt-2 text-xs text-second">
              Les objets « Sur devis » restent affichés : leur prix se discute avec le créateur.
            </p>
            {brouillon.prixMax !== null && (
              <button
                onClick={() => modifier({ prixMax: null })}
                className="mt-1 font-action text-sm font-semibold text-accent"
              >
                Retirer la limite de prix
              </button>
            )}
          </Groupe>

          <Groupe titre="Trier par">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['recent', 'Plus récents'],
                  ['prix_croissant', 'Prix croissant'],
                  ['prix_decroissant', 'Prix décroissant'],
                ] as [Tri, string][]
              ).map(([valeur, libelle]) => (
                <Pastille
                  key={valeur}
                  actif={brouillon.tri === valeur}
                  onClick={() => modifier({ tri: valeur })}
                >
                  {libelle}
                </Pastille>
              ))}
            </div>
          </Groupe>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-ligne bg-blanc px-5 py-3">
          <button
            onClick={onFermer}
            className="rounded-full border border-ligne px-5 font-action font-semibold text-encre"
          >
            Annuler
          </button>
          <button
            onClick={() => onValider(brouillon)}
            className="flex-1 rounded-full bg-encre px-5 font-action font-bold text-blanc"
          >
            Voir les résultats{nbResultats > 0 ? ` (${nbResultats})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 font-action text-xs font-bold tracking-widest text-second uppercase">
        {titre}
      </h3>
      {children}
    </section>
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
      className={`rounded-full border px-4 font-action text-sm font-semibold ${
        actif ? 'border-encre bg-encre text-blanc' : 'border-ligne bg-blanc text-encre'
      }`}
    >
      {children}
    </button>
  )
}
