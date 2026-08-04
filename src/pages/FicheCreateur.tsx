import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAtelier } from '@/hooks/useAtelier'
import { EnteteFiche } from '@/components/EnteteFiche'
import { BarreContact } from '@/components/BarreContact'
import { Monogramme } from '@/components/Monogramme'
import { ChipDispo } from '@/components/Chips'
import { metier, prixCourt } from '@/lib/format'
import { urlImage } from '@/lib/images'
import { lienAtelier } from '@/lib/whatsapp'
import { trackEvent } from '@/lib/analytics'
import Introuvable from '@/pages/Introuvable'

export default function FicheCreateur() {
  const { slug } = useParams<{ slug: string }>()
  const { data: atelier, isPending, isError, refetch } = useAtelier(slug)

  useEffect(() => {
    if (atelier) trackEvent('vendor_view', { vendor_id: atelier.id })
  }, [atelier])

  if (isPending) return <Squelette />
  if (isError) return <Echec onReessayer={() => void refetch()} />
  if (!atelier) return <Introuvable quoi="atelier" />

  const lieu = atelier.neighborhood
    ? `${atelier.city}, ${atelier.neighborhood}`
    : atelier.city
  const offres = atelier.offers ?? []

  return (
    <main className="mx-auto max-w-2xl pb-28">
      <EnteteFiche titre={atelier.display_name} />

      {atelier.cover_url && (
        <div className="mx-4 aspect-[16/7] overflow-hidden rounded-2xl">
          <img src={atelier.cover_url} alt="" className="size-full object-cover" />
        </div>
      )}

      <div className="px-5">
        <div className="mt-5 flex items-center gap-4">
          <Monogramme nom={atelier.display_name} logoUrl={atelier.logo_url} taille="lg" />
          <div className="min-w-0">
            <h1 className="text-xl leading-tight font-bold text-encre">
              {atelier.display_name}
              {atelier.is_verified && (
                <svg
                  viewBox="0 0 20 20"
                  className="ml-1.5 inline-block size-5 -translate-y-px align-middle fill-accent"
                  role="img"
                  aria-label="Créateur vérifié"
                >
                  <path d="M10 1.5 12 3.6l2.9-.3.6 2.9 2.5 1.5-1.3 2.6 1.3 2.6-2.5 1.5-.6 2.9-2.9-.3L10 18.5 8 16.4l-2.9.3-.6-2.9-2.5-1.5 1.3-2.6L2 7.1l2.5-1.5.6-2.9 2.9.3z" />
                  <path d="m8.9 12.7-2.6-2.6 1.1-1.1 1.5 1.5 3.7-3.7 1.1 1.1z" className="fill-blanc" />
                </svg>
              )}
            </h1>
            <p className="text-second">
              {metier(atelier.vendor_type)} · {lieu}
            </p>
          </div>
        </div>

        {/* Les seuls repères affichés sont ceux que la base connaît vraiment.
            Le « répond sous 2 h » de la maquette n'existe pas encore : mieux
            vaut ne rien promettre que promettre à tort. */}
        <div className="mt-5 flex items-center gap-5 border-y border-ligne py-4">
          <Repere valeur={String(offres.length)} legende={offres.length > 1 ? 'objets' : 'objet'} />
          {atelier.accepts_custom && (
            <p className="text-sm leading-snug text-second">
              <span className="font-bold text-encre">Accepte les commandes sur mesure.</span>{' '}
              Décrivez ce que vous cherchez dans votre message.
            </p>
          )}
        </div>

        {atelier.tagline && <p className="mt-5 text-lg leading-snug text-encre">{atelier.tagline}</p>}
        {atelier.bio && <p className="mt-3 leading-relaxed whitespace-pre-line text-second">{atelier.bio}</p>}
        {atelier.story && <p className="mt-3 leading-relaxed whitespace-pre-line text-second">{atelier.story}</p>}

        <h2 className="mt-8 font-action text-sm font-bold tracking-wide text-encre">
          Ses pièces {offres.length > 0 && <span className="text-second">· {offres.length}</span>}
        </h2>

        {offres.length === 0 ? (
          <p className="mt-3 rounded-xl border border-ligne bg-blanc p-4 text-sm text-second">
            Aucune pièce en ligne pour le moment. Vous pouvez tout de même contacter l'atelier.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5">
            {offres.map((o) => (
              <Link
                key={o.id}
                to={`/offre/${o.slug}`}
                className={o.is_available ? '' : 'opacity-45'}
              >
                <div className="aspect-square overflow-hidden rounded-xl">
                  {o.offer_images?.[0] ? (
                    <img
                      src={urlImage(o.offer_images[0].storage_path)}
                      alt={o.offer_images[0].alt_text ?? o.title}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="hachure size-full" />
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-snug font-medium text-encre">
                  {o.title}
                </p>
                <p className="mt-0.5 font-action text-sm font-bold text-accent">
                  {prixCourt(o.price_mode, o.price_cfa)}
                </p>
                <div className="mt-1.5">
                  <ChipDispo offre={o} compact />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BarreContact
        lien={lienAtelier({
          whatsapp_number: atelier.whatsapp_number,
          nom: atelier.display_name,
          slug: atelier.slug,
        })}
        libelle={`Contacter ${atelier.contact_name ?? atelier.display_name}`}
        onContact={() =>
          trackEvent('whatsapp_click', {
            vendor_id: atelier.id,
            metadata: { depuis: 'fiche_createur' },
          })
        }
      />
    </main>
  )
}

function Repere({ valeur, legende }: { valeur: string; legende: string }) {
  return (
    <div>
      <p className="font-action text-lg leading-tight font-bold text-encre">{valeur}</p>
      <p className="text-xs text-second">{legende}</p>
    </div>
  )
}

function Squelette() {
  return (
    <main aria-hidden="true" className="mx-auto max-w-2xl px-5 pt-16">
      <div className="flex items-center gap-4">
        <div className="shimmer size-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="shimmer h-5 w-1/2 rounded" />
          <div className="shimmer h-4 w-1/3 rounded" />
        </div>
      </div>
      <div className="shimmer mt-6 h-16 rounded" />
      <div className="mt-8 grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="shimmer aspect-square rounded-xl" />
            <div className="shimmer mt-2 h-4 w-full rounded" />
          </div>
        ))}
      </div>
    </main>
  )
}

function Echec({ onReessayer }: { onReessayer: () => void }) {
  return (
    <main className="mx-auto max-w-2xl px-5 pt-20 text-center">
      <p className="font-bold text-encre">Impossible de charger cet atelier</p>
      <p className="mt-1 text-sm text-second">Votre connexion est peut-être interrompue.</p>
      <button
        onClick={onReessayer}
        className="mt-4 rounded-full bg-encre px-6 font-action font-semibold text-blanc"
      >
        Réessayer
      </button>
    </main>
  )
}
