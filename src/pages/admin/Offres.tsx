import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminOffres, useActionOffre, useConfirmerFraicheur } from '@/hooks/useAdminOffers'
import { prix } from '@/lib/format'
import { urlImage } from '@/lib/images'
import type { OfferStatus } from '@/types/database'

const ONGLETS: [OfferStatus | 'tous', string][] = [
  ['published', 'En ligne'],
  ['draft', 'Brouillons'],
  ['pending', 'À valider'],
  ['archived', 'Archivées'],
  ['tous', 'Toutes'],
]

/** Au-delà de ce délai sans confirmation, la fiche sera repassée en brouillon. */
const JOURS_AVANT_PEREMPTION = 60

export default function Offres() {
  const [onglet, setOnglet] = useState<OfferStatus | 'tous'>('published')
  const { data: offres, isPending } = useAdminOffres(onglet)
  const action = useActionOffre()
  const confirmer = useConfirmerFraicheur()

  return (
    <main className="mx-auto max-w-2xl px-5 pt-6 pb-24">
      <Link to="/admin" className="font-action text-sm font-semibold text-accent">
        ‹ Tableau de bord
      </Link>

      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-encre">Offres</h1>
        <Link
          to="/admin/offres/nouvelle"
          className="flex shrink-0 items-center rounded-full bg-encre px-5 font-action font-bold text-blanc"
        >
          + Nouvelle
        </Link>
      </div>

      <div className="scroll-x -mx-5 mt-4 flex gap-2 px-5">
        {ONGLETS.map(([valeur, libelle]) => (
          <button
            key={valeur}
            onClick={() => setOnglet(valeur)}
            aria-pressed={onglet === valeur}
            className={`shrink-0 rounded-full border px-4 py-2 font-action text-sm font-semibold ${
              onglet === valeur
                ? 'border-encre bg-encre text-blanc'
                : 'border-ligne bg-blanc text-encre'
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {isPending && (
        <div aria-hidden="true" className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="shimmer h-28 rounded-xl" />
          ))}
        </div>
      )}

      {offres?.length === 0 && (
        <p className="mt-4 rounded-xl border border-ligne bg-blanc p-4 text-sm text-second">
          Aucune offre dans cette catégorie.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {offres?.map((o) => {
          const photo = o.offer_images?.sort((a, b) => a.sort_order - b.sort_order)[0]
          const jours = Math.floor(
            (Date.now() - new Date(o.last_confirmed_at).getTime()) / 86_400_000,
          )
          const bientotPerimee = jours >= JOURS_AVANT_PEREMPTION - 14

          return (
            <li key={o.id} className="rounded-xl border border-ligne bg-blanc p-3">
              <div className="flex gap-3">
                <Link to={`/admin/offres/${o.id}`} className="shrink-0">
                  <div className="size-16 overflow-hidden rounded-lg">
                    {photo ? (
                      <img
                        src={urlImage(photo.storage_path)}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="hachure size-full" />
                    )}
                  </div>
                </Link>

                <div className="min-w-0 flex-1">
                  <Link to={`/admin/offres/${o.id}`}>
                    <p className="truncate font-bold text-encre">{o.title}</p>
                    <p className="truncate text-sm text-second">{o.vendor_display_name}</p>
                    <p className="font-action text-sm font-bold text-accent">
                      {prix(o.price_mode, o.price_cfa)}
                    </p>
                  </Link>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <EtiquetteStatut statut={o.status} />
                  {!o.is_available && (
                    <span className="rounded-full bg-ligne px-2 py-0.5 font-action text-[11px] font-bold text-second">
                      Rupture
                    </span>
                  )}
                </div>
              </div>

              {bientotPerimee && o.status === 'published' && (
                <p className="mt-2 rounded-lg border border-commande/40 bg-commande/5 px-3 py-2 text-xs text-second">
                  Non confirmée depuis {jours} jours. Au-delà de {JOURS_AVANT_PEREMPTION}, la fiche
                  repassera automatiquement en brouillon.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {o.status !== 'published' ? (
                  <Bouton
                    onClick={() => action.mutate({ id: o.id, bout: { status: 'published' } })}
                  >
                    Publier
                  </Bouton>
                ) : (
                  <Bouton onClick={() => action.mutate({ id: o.id, bout: { status: 'archived' } })}>
                    Archiver
                  </Bouton>
                )}

                <Bouton
                  onClick={() =>
                    action.mutate({ id: o.id, bout: { is_available: !o.is_available } })
                  }
                >
                  {o.is_available ? 'Signaler en rupture' : 'De nouveau disponible'}
                </Bouton>

                <Bouton onClick={() => confirmer.mutate(o.id)}>
                  {confirmer.isPending ? '…' : 'Confirmer'}
                </Bouton>
              </div>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

function Bouton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-ligne px-3 py-1.5 font-action text-xs font-semibold text-encre"
    >
      {children}
    </button>
  )
}

function EtiquetteStatut({ statut }: { statut: OfferStatus }) {
  const styles: Record<OfferStatus, string> = {
    published: 'bg-whatsapp text-blanc',
    draft: 'bg-ligne text-second',
    pending: 'bg-commande text-blanc',
    archived: 'bg-second text-blanc',
  }
  const libelles: Record<OfferStatus, string> = {
    published: 'En ligne',
    draft: 'Brouillon',
    pending: 'À valider',
    archived: 'Archivée',
  }

  return (
    <span className={`rounded-full px-2 py-0.5 font-action text-[11px] font-bold ${styles[statut]}`}>
      {libelles[statut]}
    </span>
  )
}
