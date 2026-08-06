import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAtelier } from '@/hooks/useAtelier'
import { EnteteFiche } from '@/components/EnteteFiche'
import { BarreContact } from '@/components/BarreContact'
import { FeuilleWhatsApp } from '@/components/FeuilleWhatsApp'
import { Monogramme } from '@/components/Monogramme'
import { Photo } from '@/components/Photo'
import { Visionneuse } from '@/components/Visionneuse'
import { VignetteObjet } from '@/components/VignetteObjet'
import { metier, montant } from '@/lib/format'
import { messageAtelier } from '@/lib/whatsapp'
import { trackEvent } from '@/lib/analytics'

/**
 * La fiche d'un atelier — l'écran central de la phase 1.
 *
 * L'ordre des éléments suit celui des questions que se pose un visiteur :
 * à quoi ça ressemble, qui est-ce, combien ça coûte, comment j'en vois plus,
 * comment je les joins. Le bouton WhatsApp reste ancré en bas tout du long.
 */
export default function FicheCreateur() {
  const { slug } = useParams<{ slug: string }>()
  const { data: atelier, isPending, isError, refetch } = useAtelier(slug)
  const [feuilleOuverte, setFeuilleOuverte] = useState(false)
  const [photoOuverte, setPhotoOuverte] = useState<number | null>(null)

  useEffect(() => {
    if (atelier) trackEvent('vendor_view', { vendor_id: atelier.id })
  }, [atelier])

  if (isPending) return <Squelette />
  if (isError) return <Echec onReessayer={() => void refetch()} />
  if (!atelier) return <Introuvable />

  const lieu = atelier.neighborhood ? `${atelier.city}, ${atelier.neighborhood}` : atelier.city
  const photos = atelier.vendor_images ?? []
  const offres = atelier.offers ?? []

  return (
    <main className="mx-auto max-w-2xl pb-28">
      <EnteteFiche titre={atelier.display_name} />

      {/* La galerie d'abord : c'est elle qui décide si le visiteur reste. */}
      {photos.length > 0 ? (
        <div className="scroll-x flex gap-2 px-4">
          {photos.map((p, i) => (
            <button
              key={p.storage_path}
              onClick={() => setPhotoOuverte(i)}
              aria-label={`Voir la photo ${i + 1} en grand`}
              className={`shrink-0 snap-start overflow-hidden rounded-2xl ${
                photos.length === 1 ? 'w-full aspect-[5/3]' : 'w-[78%] aspect-[4/3]'
              }`}
            >
              <Photo
                chemin={p.storage_path}
                alt={p.alt_text ?? atelier.display_name}
                source="atelier"
                eager={i === 0}
                mention
                className="size-full"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="mx-4 flex aspect-[5/3] items-center justify-center rounded-2xl hachure">
          <span className="font-action text-xs text-second">photos en attente</span>
        </div>
      )}

      <div className="px-5">
        <div className="mt-5 flex items-center gap-4">
          <Monogramme nom={atelier.display_name} logoUrl={atelier.logo_url} taille="lg" />
          <div className="min-w-0">
            <h1 className="text-xl leading-tight font-bold text-encre">
              {atelier.display_name}
              {atelier.is_verified && <Verifie />}
            </h1>
            <p className="text-second">
              {metier(atelier.vendor_type)} · {lieu}
            </p>
          </div>
        </div>

        {atelier.price_from_cfa !== null && (
          <div className="mt-4">
            <p className="font-action text-sm text-second">À partir de</p>
            <p className="font-action text-3xl font-bold text-accent">
              {montant(atelier.price_from_cfa)}
            </p>
          </div>
        )}

        {atelier.tagline && (
          <p className="mt-4 text-lg leading-snug text-encre">{atelier.tagline}</p>
        )}
        {atelier.bio && (
          <p className="mt-3 leading-relaxed whitespace-pre-line text-second">{atelier.bio}</p>
        )}
        {atelier.story && (
          <p className="mt-3 leading-relaxed whitespace-pre-line text-second">{atelier.story}</p>
        )}

        {atelier.accepts_custom && (
          <p className="mt-4 rounded-xl border border-ligne bg-blanc p-4 text-sm text-second">
            <span className="font-bold text-encre">Accepte les commandes sur mesure.</span> Décrivez
            ce que vous cherchez dans votre message.
          </p>
        )}

        {/* Le catalogue : externe si le créateur en a un, sinon ses pièces
            saisies ici. C'est lui qui choisit — voir migration 0012. */}
        {atelier.catalog_url ? (
          <a
            href={atelier.catalog_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('catalog_click', { vendor_id: atelier.id })}
            className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-encre bg-blanc px-4 py-3.5"
          >
            <span className="min-w-0">
              <span className="block font-action font-bold text-encre">Voir son catalogue</span>
              <span className="block truncate text-sm text-second">
                {nomDuSite(atelier.catalog_url)}
              </span>
            </span>
            <span className="shrink-0 font-action text-accent">↗</span>
          </a>
        ) : offres.length > 0 ? (
          <section className="mt-6">
            <h2 className="font-action text-sm font-bold tracking-wide text-encre">
              Ses pièces <span className="text-second">· {offres.length}</span>
            </h2>
            <div className="scroll-x -mx-5 mt-3 flex gap-3 px-5">
              {offres.map((o) => (
                <VignetteObjet key={o.id} offre={o} />
              ))}
            </div>
          </section>
        ) : null}

        {(atelier.instagram_handle || atelier.phone) && (
          <div className="mt-6 flex flex-wrap gap-2">
            {atelier.instagram_handle && (
              <a
                href={`https://instagram.com/${atelier.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('instagram_click', { vendor_id: atelier.id })}
                className="flex items-center rounded-full border border-ligne bg-blanc px-4 font-action text-sm font-semibold text-encre"
              >
                @{atelier.instagram_handle}
              </a>
            )}
            {atelier.phone && (
              <a
                href={`tel:${atelier.phone}`}
                onClick={() => trackEvent('phone_click', { vendor_id: atelier.id })}
                className="flex items-center rounded-full border border-ligne bg-blanc px-4 font-action text-sm font-semibold text-encre"
              >
                Appeler
              </a>
            )}
          </div>
        )}
      </div>

      <BarreContact
        libelle={`Contacter ${atelier.contact_name ?? atelier.display_name}`}
        onAppuyer={() => setFeuilleOuverte(true)}
      />

      {feuilleOuverte && (
        <FeuilleWhatsApp
          destinataire={{
            nom: atelier.display_name,
            whatsapp_number: atelier.whatsapp_number,
            logo_url: atelier.logo_url,
          }}
          messageInitial={messageAtelier({
            nom: atelier.display_name,
            slug: atelier.slug,
            contact_name: atelier.contact_name,
          })}
          onOuvrir={() =>
            trackEvent('whatsapp_click', {
              vendor_id: atelier.id,
              metadata: { depuis: 'fiche_atelier' },
            })
          }
          onFermer={() => setFeuilleOuverte(false)}
        />
      )}

      {photoOuverte !== null && (
        <Visionneuse
          photos={photos}
          depart={photoOuverte}
          source="atelier"
          legende={atelier.display_name}
          onFermer={() => setPhotoOuverte(null)}
        />
      )}
    </main>
  )
}

/** « instagram.com » plutôt que l'adresse entière, illisible sur un téléphone. */
function nomDuSite(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function Verifie() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="ml-1.5 inline-block size-5 -translate-y-px align-middle fill-accent"
      role="img"
      aria-label="Créateur vérifié"
    >
      <path d="M10 1.5 12 3.6l2.9-.3.6 2.9 2.5 1.5-1.3 2.6 1.3 2.6-2.5 1.5-.6 2.9-2.9-.3L10 18.5 8 16.4l-2.9.3-.6-2.9-2.5-1.5 1.3-2.6L2 7.1l2.5-1.5.6-2.9 2.9.3z" />
      <path d="m8.9 12.7-2.6-2.6 1.1-1.1 1.5 1.5 3.7-3.7 1.1 1.1z" className="fill-blanc" />
    </svg>
  )
}

function Introuvable() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-8 text-center">
      <p className="font-action text-5xl font-bold text-ligne">404</p>
      <h1 className="mt-4 text-xl font-bold text-encre">Cet atelier n'est plus en ligne</h1>
      <p className="mt-2 text-second">La fiche a été retirée ou mise en pause par son créateur.</p>
      <Link
        to="/"
        className="mt-6 flex items-center rounded-full bg-encre px-6 font-action font-semibold text-blanc"
      >
        Voir tous les ateliers
      </Link>
    </main>
  )
}

function Squelette() {
  return (
    <main aria-hidden="true" className="mx-auto max-w-2xl px-4 pt-14">
      <div className="shimmer aspect-[5/3] rounded-2xl" />
      <div className="mt-5 flex items-center gap-4">
        <div className="shimmer size-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="shimmer h-5 w-1/2 rounded" />
          <div className="shimmer h-4 w-1/3 rounded" />
        </div>
      </div>
      <div className="shimmer mt-6 h-9 w-40 rounded" />
      <div className="shimmer mt-4 h-4 w-full rounded" />
      <div className="shimmer mt-2 h-4 w-4/5 rounded" />
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
