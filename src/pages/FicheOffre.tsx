import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useOffre, useAutresOffres } from '@/hooks/useOffre'
import { EnteteFiche } from '@/components/EnteteFiche'
import { BarreContact } from '@/components/BarreContact'
import { ChipDispo, ChipPerso, ChipInfo } from '@/components/Chips'
import { Monogramme } from '@/components/Monogramme'
import { VignetteObjet } from '@/components/VignetteObjet'
import { montant, metier, prix as prixComplet } from '@/lib/format'
import { urlImage } from '@/lib/images'
import { FeuilleWhatsApp } from '@/components/FeuilleWhatsApp'
import { messageOffre } from '@/lib/whatsapp'
import { trackEvent } from '@/lib/analytics'
import Introuvable from '@/pages/Introuvable'

export default function FicheOffre() {
  const { slug } = useParams<{ slug: string }>()
  const { data: offre, isPending, isError, refetch } = useOffre(slug)
  const { data: autres } = useAutresOffres(offre?.vendors.id, slug)
  const [feuilleOuverte, setFeuilleOuverte] = useState(false)

  // Une vue par ouverture de fiche. La base refuse les doublons d'une même
  // session dans la même heure : inutile de s'en préoccuper ici.
  useEffect(() => {
    if (offre) {
      trackEvent('offer_view', { offer_id: offre.id, vendor_id: offre.vendors.id })
    }
  }, [offre])

  if (isPending) return <Squelette />
  if (isError) return <Echec onReessayer={() => void refetch()} />
  if (!offre) return <Introuvable quoi="offre" />

  const v = offre.vendors
  const photo = offre.offer_images?.[0]
  const surDevis = offre.price_mode === 'quote' || offre.price_cfa === null
  const legendePrix = offre.price_mode === 'from' ? 'À partir de' : undefined

  return (
    <main className="mx-auto max-w-2xl pb-28">
      <EnteteFiche titre={offre.title} />

      {/* Galerie — une seule photo pour l'instant, le carrousel viendra quand
          les fiches en auront plusieurs. */}
      <div className="relative mx-4 aspect-[4/3] overflow-hidden rounded-2xl">
        {photo ? (
          <img
            src={urlImage(photo.storage_path)}
            alt={photo.alt_text ?? offre.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="hachure flex size-full items-center justify-center">
            <span className="font-action text-xs text-second">photo en attente</span>
          </div>
        )}
        {offre.is_customizable && (
          <span className="absolute top-3 left-3 rounded-full bg-perso px-3 py-1 font-action text-xs font-bold text-encre">
            Personnalisable
          </span>
        )}
      </div>

      <div className="px-5">
        {offre.categories && (
          <p className="mt-5 font-action text-xs tracking-widest text-second uppercase">
            {offre.categories.name}
          </p>
        )}

        <h1 className="mt-1 text-2xl leading-tight font-bold text-encre">{offre.title}</h1>

        <div className="mt-4">
          {legendePrix && <p className="font-action text-sm text-second">{legendePrix}</p>}
          <p className="font-action text-3xl font-bold text-accent">
            {surDevis ? 'Sur devis' : montant(offre.price_cfa!)}
          </p>
          {offre.unit && !surDevis && <p className="mt-0.5 text-sm text-second">{offre.unit}</p>}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ChipDispo offre={offre} />
          {offre.origin_city && <ChipInfo>Retrait à {offre.origin_city}</ChipInfo>}
          {offre.is_customizable && <ChipPerso />}
        </div>

        {/* Fabriqué à la commande : le dire explicitement, pas seulement dans
            un badge. Un client qui croit acheter du stock et attend dix jours
            ne revient pas. */}
        {offre.is_made_to_order && (
          <p className="mt-4 rounded-xl border border-ligne bg-blanc p-4 text-sm text-second">
            <span className="font-bold text-encre">Fabriqué à la commande.</span>{' '}
            {offre.lead_time_days
              ? `Comptez environ ${offre.lead_time_days} jours après votre commande.`
              : 'Le délai est à convenir avec le créateur.'}
          </p>
        )}

        {offre.is_customizable && (
          <p className="mt-3 rounded-xl border border-ligne bg-blanc p-4 text-sm text-second">
            <span className="font-bold text-encre">Personnalisable.</span> Indiquez au créateur ce
            que vous souhaitez au moment du message.
          </p>
        )}

        {offre.description && (
          <p className="mt-5 leading-relaxed whitespace-pre-line text-encre">{offre.description}</p>
        )}

        {offre.details && (
          <p className="mt-3 leading-relaxed whitespace-pre-line text-second">{offre.details}</p>
        )}

        {/* Le créateur : aussi important que l'objet. */}
        <Link
          to={`/createur/${v.slug}`}
          className="mt-6 flex items-center gap-3 rounded-2xl border border-ligne bg-blanc p-4"
        >
          <Monogramme nom={v.display_name} logoUrl={v.logo_url} />
          <div className="min-w-0 flex-1">
            <p className="leading-tight font-bold text-encre">{v.display_name}</p>
            <p className="truncate text-sm text-second">
              {metier(v.vendor_type)} · {v.city}
            </p>
          </div>
          <span className="shrink-0 font-action text-sm font-semibold text-accent">
            Voir l'atelier ›
          </span>
        </Link>

        {autres && autres.length > 0 && (
          <section className="mt-8">
            <h2 className="font-action text-sm font-bold tracking-wide text-encre">
              Autres créations de {v.display_name}
            </h2>
            <div className="scroll-x -mx-5 mt-3 flex gap-3 px-5">
              {autres.map((o) => (
                <VignetteObjet key={o.id} offre={o as never} />
              ))}
            </div>
          </section>
        )}
      </div>

      <BarreContact
        libelle={surDevis ? 'Demander un devis' : 'Commander sur WhatsApp'}
        rappel={{
          legende: legendePrix,
          valeur: surDevis ? 'Sur devis' : montant(offre.price_cfa!),
        }}
        onAppuyer={() => setFeuilleOuverte(true)}
      />

      {feuilleOuverte && (
        <FeuilleWhatsApp
          destinataire={{
            nom: v.display_name,
            whatsapp_number: v.whatsapp_number,
            logo_url: v.logo_url,
          }}
          objet={{
            titre: offre.title,
            prixAffiche: prixComplet(offre.price_mode, offre.price_cfa),
          }}
          messageInitial={messageOffre({
            titre: offre.title,
            price_mode: offre.price_mode,
            price_cfa: offre.price_cfa,
            slug: offre.slug,
            contact_name: v.contact_name,
            is_customizable: offre.is_customizable,
          })}
          onOuvrir={() =>
            trackEvent('whatsapp_click', {
              offer_id: offre.id,
              vendor_id: v.id,
              metadata: { depuis: 'fiche_offre', price_mode: offre.price_mode },
            })
          }
          onFermer={() => setFeuilleOuverte(false)}
        />
      )}
    </main>
  )
}

function Squelette() {
  return (
    <main aria-hidden="true" className="mx-auto max-w-2xl px-5 pt-14">
      <div className="shimmer aspect-[4/3] rounded-2xl" />
      <div className="shimmer mt-5 h-3 w-20 rounded" />
      <div className="shimmer mt-3 h-7 w-3/4 rounded" />
      <div className="shimmer mt-4 h-9 w-40 rounded" />
      <div className="shimmer mt-4 h-8 w-52 rounded-full" />
      <div className="shimmer mt-5 h-4 w-full rounded" />
      <div className="shimmer mt-2 h-4 w-5/6 rounded" />
    </main>
  )
}

function Echec({ onReessayer }: { onReessayer: () => void }) {
  return (
    <main className="mx-auto max-w-2xl px-5 pt-20 text-center">
      <p className="font-bold text-encre">Impossible de charger cette fiche</p>
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
