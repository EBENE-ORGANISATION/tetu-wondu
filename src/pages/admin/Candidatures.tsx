import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  useCandidatures,
  useAccepterCandidature,
  useRefuserCandidature,
} from '@/hooks/useAdminCandidatures'
import type { CandidatureAdmin } from '@/hooks/useAdminCandidatures'
import { Photo } from '@/components/Photo'
import { montant, metier, prix } from '@/lib/format'
import { lienWhatsApp } from '@/lib/whatsapp'

const NOM_APP = import.meta.env.VITE_APP_NAME || 'la plateforme'
const dateFr = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

const ONGLETS = [
  ['nouvelle', 'À traiter'],
  ['acceptee', 'Acceptées'],
  ['refusee', 'Refusées'],
] as const

/**
 * La file d'attente des candidatures.
 *
 * L'ordre des gestes compte : on lit, on écrit au créateur pour vérifier que
 * c'est bien lui, PUIS on accepte. Accepter ne publie rien — l'atelier est
 * créé masqué, il faut encore le rendre visible depuis sa fiche.
 *
 * Ce double verrou est délibéré : une candidature est un formulaire ouvert à
 * tout le monde, et rien de ce qui vient d'un inconnu ne doit atteindre le site
 * sans qu'un humain l'ait regardé.
 */
export default function Candidatures() {
  const [onglet, setOnglet] = useState<(typeof ONGLETS)[number][0]>('nouvelle')
  const { data: liste, isPending, isError, error } = useCandidatures(onglet)
  const accepter = useAccepterCandidature()
  const refuser = useRefuserCandidature()
  const navigate = useNavigate()

  return (
    <main className="mx-auto max-w-2xl px-5 pt-6 pb-24">
      <Link to="/admin" className="font-action text-sm font-semibold text-accent">
        ‹ Tableau de bord
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-encre">Candidatures</h1>
      <p className="mt-1 text-sm text-second">
        Les créateurs qui demandent à figurer dans l'annuaire, depuis la page{' '}
        <Link to="/rejoindre" className="font-semibold text-accent">
          /rejoindre
        </Link>
        .
      </p>

      <div className="scroll-x -mx-5 mt-4 flex gap-2 px-5">
        {ONGLETS.map(([valeur, libelle]) => (
          <button
            key={valeur}
            onClick={() => setOnglet(valeur)}
            aria-pressed={onglet === valeur}
            className={`shrink-0 rounded-full border px-4 py-2 font-action text-sm font-semibold ${
              onglet === valeur ? 'border-encre bg-encre text-blanc' : 'border-ligne bg-blanc text-encre'
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {isPending && (
        <div aria-hidden="true" className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="shimmer h-48 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="mt-4 rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm text-encre">
          {(error as Error).message} — la migration 0015 a-t-elle été exécutée ?
        </p>
      )}

      {liste?.length === 0 && (
        <p className="mt-4 rounded-xl border border-ligne bg-blanc p-6 text-center text-sm text-second">
          {onglet === 'nouvelle'
            ? 'Aucune candidature en attente. Partagez le lien /rejoindre dans un groupe de créateurs.'
            : 'Rien dans cette catégorie.'}
        </p>
      )}

      <ul className="mt-4 space-y-4">
        {liste?.map((c) => (
          <Fiche
            key={c.id}
            c={c}
            enCours={accepter.isPending || refuser.isPending}
            onAccepter={async () => {
              const cree = await accepter.mutateAsync(c)
              navigate(`/admin/createurs/${cree.id}`)
            }}
            onRefuser={() => refuser.mutate({ id: c.id })}
          />
        ))}
      </ul>

      {accepter.isError && (
        <p className="mt-4 rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm text-encre">
          {(accepter.error as Error).message}
        </p>
      )}
    </main>
  )
}

function Fiche({
  c,
  enCours,
  onAccepter,
  onRefuser,
}: {
  c: CandidatureAdmin
  enCours: boolean
  onAccepter: () => void
  onRefuser: () => void
}) {
  const lieu = c.neighborhood ? `${c.city}, ${c.neighborhood}` : c.city

  return (
    <li className="overflow-hidden rounded-2xl border border-ligne bg-blanc">
      {c.photos.length > 0 && (
        <div className="scroll-x flex gap-1 p-1">
          {c.photos.map((p) => (
            <div key={p} className="aspect-square w-32 shrink-0 overflow-hidden rounded-xl">
              <Photo chemin={p} alt="" source="atelier" className="size-full" />
            </div>
          ))}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="min-w-0 flex-1 text-lg leading-tight font-bold text-encre">
            {c.display_name}
          </h2>
          <span className="shrink-0 font-action text-xs text-second">
            {dateFr.format(new Date(c.created_at))}
          </span>
        </div>

        <p className="text-sm text-second">
          {metier(c.vendor_type)} · {lieu}
          {c.contact_name && ` · ${c.contact_name}`}
        </p>

        {c.price_from_cfa !== null && (
          <p className="mt-1 font-action text-sm font-bold text-accent">
            À partir de {montant(c.price_from_cfa)}
          </p>
        )}

        {c.tagline && <p className="mt-2 text-encre">{c.tagline}</p>}
        {c.description && (
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-second">
            {c.description}
          </p>
        )}

        {/* Les pièces décrites : elles deviendront des offres en brouillon,
            prêtes pour le jour où l'annuaire s'ouvrira aux objets. */}
        {c.pieces?.length > 0 && (
          <div className="mt-3 rounded-xl border border-ligne p-3">
            <p className="font-action text-xs font-bold tracking-widest text-second uppercase">
              {c.pieces.length} pièce{c.pieces.length > 1 ? 's' : ''} décrite
              {c.pieces.length > 1 ? 's' : ''}
            </p>
            <ul className="mt-2 space-y-1.5">
              {c.pieces.map((p, i) => (
                <li key={i} className="flex items-baseline gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-encre">{p.titre}</span>
                  <span className="shrink-0 font-action text-xs text-second">
                    {prix(p.price_mode, p.price_cfa)}
                    {p.sur_commande && p.delai_jours ? ` · ${p.delai_jours} j` : ''}
                    {p.photos?.length ? ` · ${p.photos.length} photo${p.photos.length > 1 ? 's' : ''}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-action text-xs text-second">
          <span>WhatsApp {c.whatsapp_number}</span>
          {c.phone && <span>tél. {c.phone}</span>}
          {c.accepts_custom && <span>sur mesure</span>}
          {c.instagram && <span>@{c.instagram}</span>}
          {c.catalog_url && (
            <a href={c.catalog_url} target="_blank" rel="noopener noreferrer" className="text-accent">
              catalogue ↗
            </a>
          )}
        </div>

        {c.statut === 'nouvelle' && (
          <>
            {/* Écrire AVANT d'accepter : c'est la seule façon de vérifier que
                la personne existe et que le numéro est le bon. */}
            <a
              href={lienWhatsApp(
                c.whatsapp_number,
                `Bonjour ${c.contact_name ?? ''}, ici ${NOM_APP}. Nous avons bien reçu la candidature de « ${c.display_name} ». Confirmez-vous que c'est bien vous, et que nous pouvons publier votre fiche avec vos photos et ce numéro ?`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center rounded-full bg-whatsapp px-4 py-2.5 font-action text-sm font-bold text-blanc"
            >
              Écrire pour vérifier
            </a>

            <div className="mt-2 flex gap-2">
              <button
                onClick={onRefuser}
                disabled={enCours}
                className="rounded-full border border-ligne px-4 py-2 font-action text-sm font-semibold text-encre disabled:opacity-50"
              >
                Refuser
              </button>
              <button
                onClick={onAccepter}
                disabled={enCours}
                className="flex-1 rounded-full bg-encre px-4 py-2 font-action text-sm font-bold text-blanc disabled:opacity-50"
              >
                {enCours ? '…' : "Créer l'atelier"}
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-second">
              L'atelier sera créé <strong>masqué</strong>. Rien n'apparaît en ligne avant que vous
              ne le rendiez visible.
            </p>
          </>
        )}

        {c.statut === 'acceptee' && c.vendor_id && (
          <Link
            to={`/admin/createurs/${c.vendor_id}`}
            className="mt-4 flex items-center justify-center rounded-full border border-encre px-4 py-2 font-action text-sm font-semibold text-encre"
          >
            Ouvrir la fiche de l'atelier
          </Link>
        )}
      </div>
    </li>
  )
}
