import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useOffreAdmin, useEnregistrerOffre, useSupprimerImage } from '@/hooks/useAdminOffers'
import { useAdminVendors } from '@/hooks/useAdminVendors'
import { useCategories } from '@/hooks/useCategories'
import { useUploadImages } from '@/hooks/useUploadImages'
import { Champ, Saisie, Zone, Liste, Bascule, Section, Segments } from '@/components/admin/Champs'
import { fabriquerSlug } from '@/lib/slug'
import { poidsLisible } from '@/lib/compression'
import { urlImage } from '@/lib/images'
import { prix } from '@/lib/format'
import type { Offer, PriceMode, OfferStatus } from '@/types/database'

type Brouillon = Partial<Offer>

const VIDE: Brouillon = {
  title: '',
  slug: '',
  vendor_id: '',
  category_id: null,
  offer_type: 'product',
  description: '',
  details: '',
  price_mode: 'fixed',
  price_cfa: null,
  unit: '',
  is_made_to_order: false,
  lead_time_days: null,
  is_customizable: false,
  origin_city: '',
  status: 'draft',
  is_available: true,
}

export default function FormulaireOffre() {
  const { id } = useParams<{ id: string }>()
  const creation = id === 'nouvelle'
  const navigate = useNavigate()

  const { data: existante, isPending } = useOffreAdmin(id)
  const { data: createurs } = useAdminVendors()
  const { data: categories } = useCategories()
  const enregistrer = useEnregistrerOffre()
  const envoyer = useUploadImages()
  const supprimerImage = useSupprimerImage()

  const [o, setO] = useState<Brouillon>(VIDE)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [progres, setProgres] = useState<string | null>(null)
  const champFichier = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (existante) setO(existante)
  }, [existante])

  const modifier = (bout: Brouillon) => setO((ancien) => ({ ...ancien, ...bout }))
  const surDevis = o.price_mode === 'quote'

  function valider(): boolean {
    const e: Record<string, string> = {}
    if (!o.title?.trim()) e.title = "Le nom de l'objet est obligatoire."
    if (!o.vendor_id) e.vendor_id = 'Choisissez le créateur.'
    if (!surDevis && (o.price_cfa === null || o.price_cfa === undefined || o.price_cfa < 0))
      e.price_cfa = 'Indiquez un prix, ou passez en « Sur devis ».'
    if (o.is_made_to_order && !o.lead_time_days)
      e.lead_time_days = 'Indiquez le délai, c’est ce que le client veut savoir.'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  async function soumettre(evt: React.FormEvent) {
    evt.preventDefault()
    if (!valider()) return

    const valeurs: Brouillon = {
      ...o,
      // Le prix est vidé en mode devis : la base l'exige, et afficher « 0 FCFA »
      // serait pire que ne rien afficher.
      price_cfa: surDevis ? null : o.price_cfa,
      lead_time_days: o.is_made_to_order ? o.lead_time_days : null,
      slug: creation ? o.slug || fabriquerSlug(o.title ?? '') : o.slug,
    }

    try {
      const enregistree = await enregistrer.mutateAsync({
        id: creation ? undefined : id,
        valeurs,
      })
      navigate(`/admin/offres/${enregistree.id}`, { replace: true })
    } catch (e) {
      const m = (e as Error).message
      setErreurs({
        _global: m.includes('offers_slug_key')
          ? "Cette adresse est déjà utilisée par une autre offre."
          : m.includes('price_required_unless_quote')
            ? 'Un prix est obligatoire, sauf en mode « Sur devis ».'
            : m,
      })
    }
  }

  async function choisirPhotos(evt: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(evt.target.files ?? [])
    if (!fichiers.length || !existante) return

    const resultat = await envoyer.mutateAsync({
      offerId: existante.id,
      fichiers,
      departSortOrder: existante.offer_images?.length ?? 0,
      onProgres: (fait, total) => setProgres(`Photo ${fait} sur ${total}…`),
    })

    setProgres(
      resultat.echecs.length
        ? `${resultat.envoyees} envoyée(s). Échec : ${resultat.echecs.join(' — ')}`
        : `${resultat.envoyees} photo(s) envoyée(s) — ${poidsLisible(resultat.poidsAvant)} réduits à ${poidsLisible(resultat.poidsApres)}.`,
    )
    if (champFichier.current) champFichier.current.value = ''
  }

  if (!creation && isPending) {
    return (
      <main aria-hidden="true" className="mx-auto max-w-2xl space-y-3 px-5 pt-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="shimmer h-14 rounded-xl" />
        ))}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pt-6 pb-24">
      <Link to="/admin/offres" className="font-action text-sm font-semibold text-accent">
        ‹ Offres
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-encre">
        {creation ? 'Nouvel objet' : o.title}
      </h1>

      <form onSubmit={(e) => void soumettre(e)} className="mt-6 space-y-8">
        <Section titre="L'objet">
          <Champ label="Créateur" obligatoire erreur={erreurs.vendor_id}>
            <Liste
              value={o.vendor_id ?? ''}
              onChange={(e) => modifier({ vendor_id: e.target.value })}
            >
              <option value="">— Choisir —</option>
              {createurs?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name}
                </option>
              ))}
            </Liste>
          </Champ>

          <Champ label="Nom de l'objet" obligatoire erreur={erreurs.title}>
            <Saisie
              value={o.title ?? ''}
              onChange={(e) => {
                const t = e.target.value
                modifier(creation ? { title: t, slug: fabriquerSlug(t) } : { title: t })
              }}
              placeholder="Pagne kenté tissé main"
            />
          </Champ>

          <Champ
            label="Adresse de la fiche"
            aide={
              creation
                ? 'Calculée automatiquement. Modifiable maintenant, plus jamais ensuite.'
                : 'Figée : les liens déjà partagés dans WhatsApp cesseraient de fonctionner.'
            }
          >
            <div className="flex items-center gap-1 rounded-xl border border-ligne bg-blanc px-3">
              <span className="shrink-0 text-sm text-second">/offre/</span>
              <input
                value={o.slug ?? ''}
                onChange={(e) => modifier({ slug: fabriquerSlug(e.target.value) })}
                disabled={!creation}
                className="w-full bg-transparent py-3 text-encre disabled:text-second"
              />
            </div>
          </Champ>

          <Champ label="Catégorie">
            <Liste
              value={o.category_id ?? ''}
              onChange={(e) => modifier({ category_id: e.target.value || null })}
            >
              <option value="">— Aucune —</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Liste>
          </Champ>

          <Champ label="Description">
            <Zone
              value={o.description ?? ''}
              onChange={(e) => modifier({ description: e.target.value })}
              placeholder="Coton teint et tissé sur métier traditionnel."
            />
          </Champ>

          <Champ label="Détails (facultatif)" aide="Matière, dimensions, conseils d'entretien.">
            <Zone value={o.details ?? ''} onChange={(e) => modifier({ details: e.target.value })} />
          </Champ>
        </Section>

        <Section titre="Prix">
          <Champ label="Comment est fixé le prix ?">
            <Segments<PriceMode>
              valeur={o.price_mode ?? 'fixed'}
              options={[
                ['fixed', 'Prix fixe'],
                ['from', 'À partir de'],
                ['quote', 'Sur devis'],
              ]}
              onChange={(m) => modifier({ price_mode: m, price_cfa: m === 'quote' ? null : o.price_cfa })}
            />
          </Champ>

          {/* Le champ prix disparaît en mode devis : demander un montant qu'on
              ne peut pas remplir est le meilleur moyen d'obtenir un zéro. */}
          {!surDevis && (
            <Champ label="Montant en FCFA" obligatoire erreur={erreurs.price_cfa}>
              <Saisie
                type="number"
                inputMode="numeric"
                min={0}
                value={o.price_cfa ?? ''}
                onChange={(e) =>
                  modifier({ price_cfa: e.target.value === '' ? null : Number(e.target.value) })
                }
                placeholder="25000"
              />
            </Champ>
          )}

          <Champ label="Unité (facultatif)" aide="« 500 g », « pièce », « 6 yards »…">
            <Saisie value={o.unit ?? ''} onChange={(e) => modifier({ unit: e.target.value })} />
          </Champ>

          <p className="rounded-xl border border-ligne bg-blanc p-3 text-sm text-second">
            Le client verra :{' '}
            <strong className="text-encre">{prix(o.price_mode ?? 'fixed', o.price_cfa ?? null)}</strong>
          </p>
        </Section>

        <Section titre="Disponibilité">
          <Champ label="L'objet existe-t-il déjà ?">
            <Segments
              valeur={o.is_made_to_order ? 'commande' : 'stock'}
              options={[
                ['stock', 'En stock'],
                ['commande', 'Sur commande'],
              ]}
              onChange={(x) => modifier({ is_made_to_order: x === 'commande' })}
            />
          </Champ>

          {o.is_made_to_order && (
            <Champ
              label="Délai en jours"
              obligatoire
              erreur={erreurs.lead_time_days}
              aide="Comptez large : un client qui attend plus longtemps que promis ne revient pas."
            >
              <Saisie
                type="number"
                inputMode="numeric"
                min={1}
                value={o.lead_time_days ?? ''}
                onChange={(e) =>
                  modifier({ lead_time_days: e.target.value === '' ? null : Number(e.target.value) })
                }
                placeholder="14"
              />
            </Champ>
          )}

          <Bascule
            label="Personnalisable"
            aide="Couleurs, initiales, dimensions au choix du client."
            coche={o.is_customizable ?? false}
            onChange={(b) => modifier({ is_customizable: b })}
          />

          <Bascule
            label="Actuellement disponible"
            aide="Décochez en cas de rupture, sans archiver la fiche."
            coche={o.is_available ?? true}
            onChange={(b) => modifier({ is_available: b })}
          />

          <Champ label="Ville de retrait (facultatif)">
            <Saisie
              value={o.origin_city ?? ''}
              onChange={(e) => modifier({ origin_city: e.target.value })}
              placeholder="Lomé"
            />
          </Champ>
        </Section>

        <Section titre="Publication">
          <Champ label="État de la fiche">
            <Liste
              value={o.status ?? 'draft'}
              onChange={(e) => modifier({ status: e.target.value as OfferStatus })}
            >
              <option value="draft">Brouillon — invisible</option>
              <option value="pending">À valider</option>
              <option value="published">En ligne</option>
              <option value="archived">Archivée</option>
            </Liste>
          </Champ>
        </Section>

        {erreurs._global && (
          <p className="rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm text-encre">
            {erreurs._global}
          </p>
        )}

        <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-ligne bg-blanc px-5 py-3">
          <button
            type="submit"
            disabled={enregistrer.isPending}
            className="flex-1 rounded-full bg-encre px-6 py-3 font-action font-bold text-blanc disabled:opacity-50"
          >
            {enregistrer.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {!creation && o.slug && (
            <a
              href={`/offre/${o.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center rounded-full border border-ligne px-5 font-action font-semibold text-encre"
            >
              Voir
            </a>
          )}
        </div>
      </form>

      {/* Les photos ne peuvent être envoyées qu'après création : chaque fichier
          est rangé dans un dossier portant l'identifiant de l'offre, qui
          n'existe pas tant qu'elle n'est pas enregistrée. */}
      <Section titre="Photos">
        {creation ? (
          <p className="rounded-xl border border-ligne bg-blanc p-4 text-sm text-second">
            Enregistrez d'abord l'objet : les photos s'ajoutent ensuite.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {existante?.offer_images
                ?.sort((a, b) => a.sort_order - b.sort_order)
                .map((img, i) => (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl">
                    <img
                      src={urlImage(img.storage_path)}
                      alt=""
                      className="size-full object-cover"
                    />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-encre/80 px-1.5 py-0.5 font-action text-[10px] font-bold text-blanc">
                        Couverture
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        supprimerImage.mutate({ id: img.id, chemin: img.storage_path })
                      }
                      aria-label="Supprimer cette photo"
                      className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-encre/80 text-blanc"
                    >
                      ×
                    </button>
                  </div>
                ))}

              <button
                type="button"
                onClick={() => champFichier.current?.click()}
                className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-ligne text-3xl text-second"
              >
                +
              </button>
            </div>

            <input
              ref={champFichier}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => void choisirPhotos(e)}
              className="hidden"
            />

            <p className="text-sm text-second">
              Les photos sont réduites dans le téléphone avant l'envoi — environ 150 Ko au lieu de
              plusieurs mégaoctets. La première sert de couverture.
            </p>

            {(envoyer.isPending || progres) && (
              <p className="rounded-xl border border-ligne bg-blanc p-3 text-sm text-encre">
                {envoyer.isPending ? (progres ?? 'Préparation…') : progres}
              </p>
            )}
          </>
        )}
      </Section>
    </main>
  )
}
