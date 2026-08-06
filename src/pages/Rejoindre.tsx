import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDeposerCandidature } from '@/hooks/useCandidature'
import type { Candidature, PieceSaisie } from '@/hooks/useCandidature'
import { Champ, Saisie, Zone, Liste, Section, Bascule } from '@/components/admin/Champs'
import { PiecesCandidature } from '@/components/PiecesCandidature'
import { nettoyerNumero, numeroValide } from '@/lib/slug'
import { poidsLisible } from '@/lib/compression'
import type { VendorType } from '@/types/database'

const NOM_APP = import.meta.env.VITE_APP_NAME || 'notre annuaire'
const MAX_PHOTOS = 6

const VIDE: Candidature = {
  display_name: '',
  contact_name: null,
  whatsapp_number: '',
  phone: null,
  city: '',
  neighborhood: null,
  vendor_type: 'maker',
  tagline: null,
  description: null,
  price_from_cfa: null,
  catalog_url: null,
  instagram: null,
  accepts_custom: false,
  consentement: false,
}

/**
 * Le formulaire par lequel un créateur demande à figurer dans l'annuaire.
 *
 * C'est l'écran qui change l'échelle du recrutement : au lieu de se déplacer
 * chez chacun, on envoie un lien dans un groupe et les fiches arrivent.
 *
 * Deux principes le gouvernent :
 *
 *  1. Le consentement est le cœur du sujet, pas une formalité. Une fiche
 *     publiée sans accord donne un créateur qui ne répond pas — et un visiteur
 *     qui a cliqué dans le vide. La case est donc explicite, non cochée par
 *     défaut, et la base refuse un envoi sans elle.
 *
 *  2. On demande le strict nécessaire. Chaque champ facultatif de plus est un
 *     candidat qui abandonne. Cinq champs obligatoires, le reste peut attendre
 *     la conversation WhatsApp.
 */
export default function Rejoindre() {
  const [c, setC] = useState<Candidature>(VIDE)
  const [photos, setPhotos] = useState<File[]>([])
  const [pieces, setPieces] = useState<PieceSaisie[]>([])
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [etape, setEtape] = useState<string | null>(null)
  const champFichier = useRef<HTMLInputElement>(null)

  const deposer = useDeposerCandidature()
  const modifier = (bout: Partial<Candidature>) => setC((a) => ({ ...a, ...bout }))

  function valider(): boolean {
    const e: Record<string, string> = {}
    if (!c.display_name.trim()) e.display_name = "Le nom de votre atelier est obligatoire."
    if (!c.city.trim()) e.city = 'Votre ville est obligatoire.'

    const numero = nettoyerNumero(c.whatsapp_number)
    if (!numero) e.whatsapp_number = 'Votre numéro WhatsApp est obligatoire.'
    else if (!numeroValide(numero))
      e.whatsapp_number =
        'Entre 8 et 15 chiffres, indicatif du pays compris et sans « + ». Exemple : 22890000001'

    if (c.catalog_url && !/^https?:\/\/.+/i.test(c.catalog_url))
      e.catalog_url = "L'adresse doit commencer par https://"

    if (!c.consentement) e.consentement = 'Sans votre accord, nous ne pouvons pas publier votre fiche.'

    // Une pièce commencée mais sans nom n'est pas exploitable : mieux vaut le
    // dire tout de suite que de la perdre en silence à l'enregistrement.
    if (pieces.some((p) => !p.titre.trim()))
      e.pieces = 'Une de vos pièces n’a pas de nom. Nommez-la ou retirez-la.'

    setErreurs(e)
    return Object.keys(e).length === 0
  }

  async function envoyer(evt: React.FormEvent) {
    evt.preventDefault()
    if (!valider()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    try {
      await deposer.mutateAsync({
        candidature: {
          ...c,
          whatsapp_number: nettoyerNumero(c.whatsapp_number),
          phone: c.phone ? nettoyerNumero(c.phone) : null,
        },
        photos,
        pieces,
        onProgres: setEtape,
      })
    } catch {
      setEtape(null)
    }
  }

  if (deposer.isSuccess) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
        <div className="rounded-2xl border border-ligne bg-blanc p-6">
          <p className="font-action text-xs tracking-widest text-second uppercase">Bien reçu</p>
          <h1 className="mt-2 text-2xl font-bold text-encre">Merci {c.contact_name ?? ''}</h1>
          <p className="mt-3 leading-relaxed text-second">
            Votre atelier <strong className="text-encre">{c.display_name}</strong> a été transmis.
            Nous le vérifions, puis nous vous écrivons sur WhatsApp au{' '}
            <strong className="text-encre">{c.whatsapp_number}</strong> avant toute publication.
          </p>
          <p className="mt-3 text-sm text-second">
            Rien n'est en ligne pour l'instant : votre fiche n'apparaîtra qu'après notre échange.
          </p>
          <Link
            to="/"
            className="mt-6 flex items-center justify-center rounded-full bg-encre px-6 py-3 font-action font-bold text-blanc"
          >
            Découvrir les autres ateliers
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pt-6 pb-16">
      <Link to="/" className="font-action text-sm font-semibold text-accent">
        ‹ {NOM_APP}
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-encre">Rejoindre l'annuaire</h1>
      <p className="mt-2 leading-relaxed text-second">
        C'est gratuit. Vous restez maître de vos prix, de vos ventes et de vos échanges : nous ne
        prenons aucune commission et ne touchons pas à l'argent. Les clients vous écrivent
        directement sur WhatsApp.
      </p>

      <form onSubmit={(e) => void envoyer(e)} className="mt-8 space-y-8">
        <Section titre="Votre atelier">
          {/* Pas de nom d'atelier réel en exemple : ce champ est vu par des
              concurrents directs, et citer l'un d'eux le met en avant
              gratuitement — ou l'embarrasse. */}
          <Champ
            label="Nom de l'atelier ou de la marque"
            obligatoire
            erreur={erreurs.display_name}
            aide="Le nom sous lequel vos clients vous connaissent."
          >
            <Saisie
              value={c.display_name}
              onChange={(e) => modifier({ display_name: e.target.value })}
            />
          </Champ>

          <Champ label="Votre prénom" aide="Celui qui apparaîtra sur le bouton de contact.">
            <Saisie
              value={c.contact_name ?? ''}
              onChange={(e) => modifier({ contact_name: e.target.value || null })}
            />
          </Champ>

          <Champ label="Ce que vous faites">
            <Liste
              value={c.vendor_type}
              onChange={(e) => modifier({ vendor_type: e.target.value as VendorType })}
            >
              <option value="maker">Je fabrique</option>
              <option value="transformer">Je transforme des produits</option>
              <option value="creator">Je crée des pièces uniques</option>
            </Liste>
          </Champ>

          <Champ
            label="En une phrase"
            aide="C'est souvent la seule chose qu'on lira. « Sérigraphie sur t-shirts, motifs de Lomé »."
          >
            <Saisie
              value={c.tagline ?? ''}
              onChange={(e) => modifier({ tagline: e.target.value || null })}
              maxLength={160}
            />
          </Champ>

          <Champ label="Présentation (facultatif)">
            <Zone
              value={c.description ?? ''}
              onChange={(e) => modifier({ description: e.target.value || null })}
              maxLength={2000}
            />
          </Champ>
        </Section>

        <Section titre="Où vous joindre">
          <Champ
            label="Numéro WhatsApp"
            obligatoire
            erreur={erreurs.whatsapp_number}
            aide="Chiffres uniquement, indicatif du pays compris, sans « + ». Exemple : 22890000001"
          >
            <Saisie
              type="tel"
              inputMode="numeric"
              value={c.whatsapp_number}
              onChange={(e) => modifier({ whatsapp_number: e.target.value })}
              placeholder="228…"
            />
          </Champ>

          <Champ label="Ville" obligatoire erreur={erreurs.city}>
            <Saisie
              value={c.city}
              onChange={(e) => modifier({ city: e.target.value })}
              placeholder="Lomé"
            />
          </Champ>

          <Champ label="Quartier (facultatif)">
            <Saisie
              value={c.neighborhood ?? ''}
              onChange={(e) => modifier({ neighborhood: e.target.value || null })}
            />
          </Champ>

          <Champ label="Autre téléphone (facultatif)" aide="Si vous préférez être appelé.">
            <Saisie
              type="tel"
              inputMode="numeric"
              value={c.phone ?? ''}
              onChange={(e) => modifier({ phone: e.target.value || null })}
            />
          </Champ>

          <Champ label="Instagram (facultatif)" aide="Sans le @.">
            <Saisie
              value={c.instagram ?? ''}
              onChange={(e) => modifier({ instagram: e.target.value.replace('@', '') || null })}
            />
          </Champ>
        </Section>

        <Section titre="Vos prix et votre catalogue">
          <Champ
            label="Prix de départ en FCFA (facultatif)"
            aide="Le prix de votre pièce la moins chère. Affiché « À partir de… »."
          >
            <Saisie
              type="number"
              inputMode="numeric"
              min={0}
              value={c.price_from_cfa ?? ''}
              onChange={(e) =>
                modifier({ price_from_cfa: e.target.value === '' ? null : Number(e.target.value) })
              }
              placeholder="5000"
            />
          </Champ>

          <Champ
            label="Lien vers votre catalogue (facultatif)"
            erreur={erreurs.catalog_url}
            aide="Votre Instagram, votre catalogue WhatsApp Business, un dossier de photos."
          >
            <Saisie
              type="url"
              inputMode="url"
              value={c.catalog_url ?? ''}
              onChange={(e) => modifier({ catalog_url: e.target.value.trim() || null })}
              placeholder="https://…"
            />
          </Champ>

          <Bascule
            label="J'accepte les commandes sur mesure"
            aide="Couleurs, tailles ou motifs au choix du client."
            coche={c.accepts_custom}
            onChange={(b) => modifier({ accepts_custom: b })}
          />
        </Section>

        <Section titre="Vos photos">
          <p className="text-sm text-second">
            Trois suffisent : votre atelier ou votre boutique, une pièce en gros plan, et vous au
            travail. Elles sont réduites dans votre téléphone avant l'envoi — cela ne consomme
            presque pas de données.
          </p>

          {photos.length > 0 && (
            <ul className="space-y-1">
              {photos.map((p, i) => (
                <li
                  key={`${p.name}-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-ligne bg-blanc px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-encre">{p.name}</span>
                  <span className="shrink-0 font-action text-xs text-second">
                    {poidsLisible(p.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPhotos((liste) => liste.filter((_, j) => j !== i))}
                    aria-label={`Retirer ${p.name}`}
                    className="shrink-0 text-lg leading-none text-accent"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          {photos.length < MAX_PHOTOS && (
            <>
              <button
                type="button"
                onClick={() => champFichier.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-ligne py-4 font-action font-semibold text-second"
              >
                + Ajouter des photos ({photos.length} / {MAX_PHOTOS})
              </button>
              <input
                ref={champFichier}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const choisies = Array.from(e.target.files ?? [])
                  setPhotos((liste) => [...liste, ...choisies].slice(0, MAX_PHOTOS))
                  if (champFichier.current) champFichier.current.value = ''
                }}
                className="hidden"
              />
            </>
          )}
        </Section>

        <Section titre="Vos pièces — facultatif">
          <PiecesCandidature pieces={pieces} onChange={setPieces} />
          {erreurs.pieces && <p className="text-sm text-accent">{erreurs.pieces}</p>}
        </Section>

        {/* Le consentement. Non coché par défaut, et la base refuse un envoi
            sans lui : c'est ce qui distingue un annuaire d'un fichier. */}
        <Section titre="Votre accord">
          <label className="flex items-start gap-3 rounded-xl border border-ligne bg-blanc p-4">
            <input
              type="checkbox"
              checked={c.consentement}
              onChange={(e) => modifier({ consentement: e.target.checked })}
              className="mt-0.5 size-6 shrink-0 accent-[var(--color-accent)]"
            />
            <span className="text-sm leading-relaxed text-encre">
              J'autorise {NOM_APP} à publier le nom de mon atelier, ma ville, mes photos et mon
              numéro WhatsApp, afin que des clients puissent me contacter. Je peux demander le
              retrait de ma fiche à tout moment, par simple message.
            </span>
          </label>
          {erreurs.consentement && (
            <p className="text-sm text-accent">{erreurs.consentement}</p>
          )}
        </Section>

        {deposer.isError && (
          <p className="rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm text-encre">
            L'envoi n'a pas abouti. {(deposer.error as Error).message}
          </p>
        )}

        <div className="sticky bottom-0 -mx-5 border-t border-ligne bg-blanc px-5 py-3">
          <button
            type="submit"
            disabled={deposer.isPending}
            className="w-full rounded-full bg-whatsapp px-6 py-3.5 font-action font-bold text-blanc disabled:opacity-50"
          >
            {deposer.isPending ? (etape ?? 'Envoi…') : 'Envoyer ma candidature'}
          </button>
          <p className="mt-2 text-center text-xs text-second">
            Rien ne sera publié avant que nous vous ayons écrit.
          </p>
        </div>
      </form>
    </main>
  )
}
