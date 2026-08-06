import { useRef } from 'react'
import { Champ, Saisie, Zone, Liste, Segments, Bascule } from '@/components/admin/Champs'
import { useCategories } from '@/hooks/useCategories'
import { prix } from '@/lib/format'
import { poidsLisible } from '@/lib/compression'
import type { PieceSaisie } from '@/hooks/useCandidature'
import type { PriceMode } from '@/types/database'

const MAX_PIECES = 6
const MAX_PHOTOS_PAR_PIECE = 3

export const PIECE_VIDE: PieceSaisie = {
  titre: '',
  description: null,
  price_mode: 'fixed',
  price_cfa: null,
  unit: null,
  sur_commande: false,
  delai_jours: null,
  personnalisable: false,
  categorie_slug: null,
  fichiers: [],
}

/**
 * La saisie des pièces, facultative.
 *
 * Elle est repliée par défaut et présentée comme un bonus, pas comme une
 * obligation : demander vingt fiches produits à l'inscription fait abandonner
 * la moitié des candidats. Celui qui remplit ici verra sa fiche prête le jour
 * où l'annuaire par objet ouvrira ; celui qui passe outre reste parfaitement
 * référencé.
 *
 * Les champs suivent les mêmes règles que le back-office : le montant
 * disparaît en « sur devis », le délai n'apparaît que si l'objet est fabriqué
 * à la commande. Ne jamais demander ce qui ne sert pas.
 */
export function PiecesCandidature({
  pieces,
  onChange,
}: {
  pieces: PieceSaisie[]
  onChange: (p: PieceSaisie[]) => void
}) {
  const { data: categories } = useCategories()

  const modifier = (i: number, bout: Partial<PieceSaisie>) =>
    onChange(pieces.map((p, j) => (j === i ? { ...p, ...bout } : p)))

  const retirer = (i: number) => onChange(pieces.filter((_, j) => j !== i))

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-second">
        Cette partie est <strong className="text-encre">facultative</strong>. Votre atelier sera
        référencé même si vous vous arrêtez ici. Décrire vos pièces maintenant vous fait gagner du
        temps plus tard : elles seront prêtes le jour où l'annuaire s'ouvrira aux objets.
      </p>

      {pieces.map((piece, i) => (
        <UnePiece
          key={i}
          index={i}
          piece={piece}
          categories={categories ?? []}
          onModifier={(bout) => modifier(i, bout)}
          onRetirer={() => retirer(i)}
        />
      ))}

      {pieces.length < MAX_PIECES && (
        <button
          type="button"
          onClick={() => onChange([...pieces, { ...PIECE_VIDE }])}
          className="w-full rounded-xl border-2 border-dashed border-ligne py-4 font-action font-semibold text-second"
        >
          + {pieces.length === 0 ? 'Décrire une pièce' : 'Ajouter une autre pièce'} ({pieces.length}{' '}
          / {MAX_PIECES})
        </button>
      )}
    </div>
  )
}

function UnePiece({
  index,
  piece,
  categories,
  onModifier,
  onRetirer,
}: {
  index: number
  piece: PieceSaisie
  categories: { id: string; name: string; slug: string }[]
  onModifier: (bout: Partial<PieceSaisie>) => void
  onRetirer: () => void
}) {
  const champFichier = useRef<HTMLInputElement>(null)
  const surDevis = piece.price_mode === 'quote'

  return (
    <div className="space-y-4 rounded-2xl border border-ligne bg-blanc p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-action text-xs font-bold tracking-widest text-second uppercase">
          Pièce {index + 1}
        </span>
        <button
          type="button"
          onClick={onRetirer}
          className="font-action text-sm font-semibold text-accent"
        >
          Retirer
        </button>
      </div>

      {/* Pas d'exemple tiré d'un atelier réel : le formulaire est rempli par
          des concurrents directs. */}
      <Champ label="Nom de la pièce" aide="Tel que vous l'annonceriez à un client.">
        <Saisie value={piece.titre} onChange={(e) => onModifier({ titre: e.target.value })} />
      </Champ>

      {categories.length > 0 && (
        <Champ label="Catégorie">
          <Liste
            value={piece.categorie_slug ?? ''}
            onChange={(e) => onModifier({ categorie_slug: e.target.value || null })}
          >
            <option value="">— Choisir —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Liste>
        </Champ>
      )}

      <Champ label="Comment fixez-vous le prix ?">
        <Segments<PriceMode>
          valeur={piece.price_mode}
          options={[
            ['fixed', 'Prix fixe'],
            ['from', 'À partir de'],
            ['quote', 'Sur devis'],
          ]}
          onChange={(m) => onModifier({ price_mode: m, price_cfa: m === 'quote' ? null : piece.price_cfa })}
        />
      </Champ>

      {/* Demander un montant qu'on ne peut pas donner est le meilleur moyen
          d'obtenir un zéro. */}
      {!surDevis && (
        <Champ label="Montant en FCFA">
          <Saisie
            type="number"
            inputMode="numeric"
            min={0}
            value={piece.price_cfa ?? ''}
            onChange={(e) =>
              onModifier({ price_cfa: e.target.value === '' ? null : Number(e.target.value) })
            }
            placeholder="6500"
          />
        </Champ>
      )}

      <Champ label="Unité (facultatif)" aide="« pièce », « 500 g », « 6 yards »…">
        <Saisie
          value={piece.unit ?? ''}
          onChange={(e) => onModifier({ unit: e.target.value || null })}
        />
      </Champ>

      <Champ label="La pièce existe-t-elle déjà ?">
        <Segments
          valeur={piece.sur_commande ? 'commande' : 'stock'}
          options={[
            ['stock', 'En stock'],
            ['commande', 'Sur commande'],
          ]}
          onChange={(x) => onModifier({ sur_commande: x === 'commande' })}
        />
      </Champ>

      {piece.sur_commande && (
        <Champ
          label="Délai en jours"
          aide="Comptez large : un client qui attend plus longtemps que promis ne revient pas."
        >
          <Saisie
            type="number"
            inputMode="numeric"
            min={1}
            value={piece.delai_jours ?? ''}
            onChange={(e) =>
              onModifier({ delai_jours: e.target.value === '' ? null : Number(e.target.value) })
            }
            placeholder="3"
          />
        </Champ>
      )}

      <Bascule
        label="Personnalisable"
        aide="Couleurs, initiales, dimensions au choix du client."
        coche={piece.personnalisable}
        onChange={(b) => onModifier({ personnalisable: b })}
      />

      <Champ label="Description (facultatif)">
        <Zone
          value={piece.description ?? ''}
          onChange={(e) => onModifier({ description: e.target.value || null })}
          maxLength={600}
        />
      </Champ>

      <div>
        <span className="font-action text-sm font-semibold text-encre">Photos de cette pièce</span>
        {piece.fichiers.length > 0 && (
          <ul className="mt-2 space-y-1">
            {piece.fichiers.map((f, j) => (
              <li
                key={`${f.name}-${j}`}
                className="flex items-center gap-2 rounded-lg border border-ligne px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-encre">{f.name}</span>
                <span className="shrink-0 font-action text-xs text-second">
                  {poidsLisible(f.size)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onModifier({ fichiers: piece.fichiers.filter((_, k) => k !== j) })
                  }
                  aria-label={`Retirer ${f.name}`}
                  className="shrink-0 text-lg leading-none text-accent"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {piece.fichiers.length < MAX_PHOTOS_PAR_PIECE && (
          <>
            <button
              type="button"
              onClick={() => champFichier.current?.click()}
              className="mt-2 w-full rounded-xl border-2 border-dashed border-ligne py-3 font-action text-sm font-semibold text-second"
            >
              + Photo ({piece.fichiers.length} / {MAX_PHOTOS_PAR_PIECE})
            </button>
            <input
              ref={champFichier}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const choisies = Array.from(e.target.files ?? [])
                onModifier({
                  fichiers: [...piece.fichiers, ...choisies].slice(0, MAX_PHOTOS_PAR_PIECE),
                })
                if (champFichier.current) champFichier.current.value = ''
              }}
              className="hidden"
            />
          </>
        )}
      </div>

      <p className="rounded-lg border border-ligne px-3 py-2 text-sm text-second">
        Le client verra :{' '}
        <strong className="text-encre">{prix(piece.price_mode, piece.price_cfa)}</strong>
        {piece.sur_commande && piece.delai_jours ? ` · Sur commande, ${piece.delai_jours} jours` : ''}
      </p>
    </div>
  )
}
