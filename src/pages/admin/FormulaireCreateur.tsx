import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useVendor, useEnregistrerVendor } from '@/hooks/useAdminVendors'
import { usePhotosAtelier, useSupprimerPhotoAtelier } from '@/hooks/usePhotosAtelier'
import { useUploadImages } from '@/hooks/useUploadImages'
import { useSupprimerAtelier } from '@/hooks/useSuppression'
import { useOffresDeLAtelier } from '@/hooks/useAdminOffers'
import { ZoneDanger } from '@/components/admin/ZoneDanger'
import { Champ, Saisie, Zone, Liste, Bascule, Section, Segments } from '@/components/admin/Champs'
import { Photo } from '@/components/Photo'
import { fabriquerSlug, nettoyerNumero, numeroValide } from '@/lib/slug'
import { poidsLisible } from '@/lib/compression'
import type { Vendor, VendorType } from '@/types/database'

type Brouillon = Partial<Vendor>

const VIDE: Brouillon = {
  display_name: '',
  slug: '',
  vendor_type: 'maker',
  contact_name: '',
  whatsapp_number: '',
  phone: '',
  instagram_handle: '',
  city: '',
  neighborhood: '',
  tagline: '',
  bio: '',
  story: '',
  accepts_custom: false,
  is_verified: false,
  is_active: true,
  price_from_cfa: null,
  catalog_url: null,
}

export default function FormulaireCreateur() {
  const { id } = useParams<{ id: string }>()
  const creation = id === 'nouveau'
  const navigate = useNavigate()

  const { data: existant, isPending } = useVendor(id)
  const enregistrer = useEnregistrerVendor()

  const [v, setV] = useState<Brouillon>(VIDE)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [progres, setProgres] = useState<string | null>(null)
  const champFichier = useRef<HTMLInputElement>(null)

  const { data: photos } = usePhotosAtelier(id)
  const envoyer = useUploadImages('atelier')
  const supprimerPhoto = useSupprimerPhotoAtelier()
  const supprimerAtelier = useSupprimerAtelier()
  const { data: offres } = useOffresDeLAtelier(id)

  async function choisirPhotos(evt: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(evt.target.files ?? [])
    if (!fichiers.length || creation || !id) return

    const resultat = await envoyer.mutateAsync({
      offerId: id,
      fichiers,
      departSortOrder: photos?.length ?? 0,
      onProgres: (fait, total) => setProgres(`Photo ${fait} sur ${total}…`),
    })

    setProgres(
      resultat.echecs.length
        ? `${resultat.envoyees} envoyée(s). Échec : ${resultat.echecs.join(' — ')}`
        : `${resultat.envoyees} photo(s) envoyée(s) — ${poidsLisible(resultat.poidsAvant)} réduits à ${poidsLisible(resultat.poidsApres)}.`,
    )
    if (champFichier.current) champFichier.current.value = ''
  }

  useEffect(() => {
    if (existant) setV(existant)
  }, [existant])

  const modifier = (bout: Brouillon) => setV((ancien) => ({ ...ancien, ...bout }))

  function valider(): boolean {
    const e: Record<string, string> = {}
    if (!v.display_name?.trim()) e.display_name = 'Le nom est obligatoire.'
    if (!v.city?.trim()) e.city = 'La ville est obligatoire.'

    // La base refuse un lien mal formé. Autant le dire ici, en clair.
    if (v.catalog_url && !/^https?:\/\/.+/i.test(v.catalog_url))
      e.catalog_url = "L'adresse doit commencer par https:// — copiez-la depuis la barre du navigateur."

    const numero = nettoyerNumero(v.whatsapp_number ?? '')
    if (!numero) e.whatsapp_number = 'Le numéro WhatsApp est obligatoire.'
    else if (!numeroValide(numero))
      e.whatsapp_number =
        'Entre 8 et 15 chiffres, indicatif pays compris et sans « + ». Exemple : 22890000001'

    setErreurs(e)
    return Object.keys(e).length === 0
  }

  async function soumettre(evt: React.FormEvent) {
    evt.preventDefault()
    if (!valider()) return

    const valeurs: Brouillon = {
      ...v,
      whatsapp_number: nettoyerNumero(v.whatsapp_number ?? ''),
      phone: v.phone ? nettoyerNumero(v.phone) : null,
      slug: creation ? v.slug || fabriquerSlug(v.display_name ?? '') : v.slug,
    }

    try {
      const enregistre = await enregistrer.mutateAsync({
        id: creation ? undefined : id,
        valeurs,
      })
      navigate(`/admin/createurs/${enregistre.id}`, { replace: true })
    } catch (e) {
      const message = (e as Error).message
      setErreurs({
        _global: message.includes('vendors_slug_key')
          ? "Cet identifiant d'adresse est déjà pris par un autre créateur."
          : message.includes('vendors_whatsapp_format')
            ? 'Le numéro WhatsApp est refusé par la base : chiffres uniquement.'
            : message,
      })
    }
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
      <Link to="/admin/createurs" className="font-action text-sm font-semibold text-accent">
        ‹ Créateurs
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-encre">
        {creation ? 'Nouveau créateur' : v.display_name}
      </h1>

      <form onSubmit={(e) => void soumettre(e)} className="mt-6 space-y-8">
        <Section titre="Identité">
          <Champ label="Nom de l'atelier" obligatoire erreur={erreurs.display_name}>
            <Saisie
              value={v.display_name ?? ''}
              onChange={(e) => {
                const nom = e.target.value
                // L'adresse ne se recalcule qu'à la création : la modifier
                // ensuite casserait tous les liens déjà partagés.
                modifier(creation ? { display_name: nom, slug: fabriquerSlug(nom) } : { display_name: nom })
              }}
              placeholder="Karité de Kara"
            />
          </Champ>

          <Champ
            label="Adresse de la fiche"
            aide={
              creation
                ? 'Calculée automatiquement. Modifiable maintenant, plus jamais ensuite.'
                : "À ne plus changer : les liens déjà partagés dans WhatsApp cesseraient de fonctionner."
            }
          >
            <div className="flex items-center gap-1 rounded-xl border border-ligne bg-blanc px-3">
              <span className="shrink-0 text-sm text-second">/createur/</span>
              <input
                value={v.slug ?? ''}
                onChange={(e) => modifier({ slug: fabriquerSlug(e.target.value) })}
                disabled={!creation}
                className="w-full bg-transparent py-3 text-encre disabled:text-second"
              />
            </div>
          </Champ>

          <Champ label="Type d'activité">
            <Liste
              value={v.vendor_type ?? 'maker'}
              onChange={(e) => modifier({ vendor_type: e.target.value as VendorType })}
            >
              <option value="maker">Fabrication</option>
              <option value="transformer">Transformation</option>
              <option value="creator">Création</option>
            </Liste>
          </Champ>

          <Champ label="Personne à contacter" aide="Le prénom qui apparaîtra sur le bouton WhatsApp.">
            <Saisie
              value={v.contact_name ?? ''}
              onChange={(e) => modifier({ contact_name: e.target.value })}
              placeholder="Mariam Tchalla"
            />
          </Champ>
        </Section>

        <Section titre="Contact">
          <Champ
            label="Numéro WhatsApp"
            obligatoire
            erreur={erreurs.whatsapp_number}
            aide="Chiffres uniquement, indicatif pays compris, sans « + ». Exemple : 22890000001"
          >
            <Saisie
              type="tel"
              inputMode="numeric"
              value={v.whatsapp_number ?? ''}
              onChange={(e) => modifier({ whatsapp_number: e.target.value })}
              placeholder="22890000001"
            />
          </Champ>

          <Champ label="Téléphone (facultatif)">
            <Saisie
              type="tel"
              inputMode="numeric"
              value={v.phone ?? ''}
              onChange={(e) => modifier({ phone: e.target.value })}
            />
          </Champ>

          <Champ label="Instagram (facultatif)" aide="Sans le @.">
            <Saisie
              value={v.instagram_handle ?? ''}
              onChange={(e) => modifier({ instagram_handle: e.target.value.replace('@', '') })}
              placeholder="atelier.zogbe"
            />
          </Champ>
        </Section>

        <Section titre="Où">
          <Champ label="Ville" obligatoire erreur={erreurs.city}>
            <Saisie
              value={v.city ?? ''}
              onChange={(e) => modifier({ city: e.target.value })}
              placeholder="Lomé"
            />
          </Champ>

          <Champ label="Quartier (facultatif)">
            <Saisie
              value={v.neighborhood ?? ''}
              onChange={(e) => modifier({ neighborhood: e.target.value })}
              placeholder="Bè-Kpota"
            />
          </Champ>
        </Section>

        {/* Les trois champs de la phase 1 : ce que le visiteur voit avant même
            d'ouvrir la fiche. */}
        <Section titre="Ce qui s'affiche sur l'annuaire">
          <Champ
            label="Prix de départ en FCFA"
            aide="Le prix de sa pièce la moins chère. Affiché « À partir de… ». Laissez vide si le créateur préfère ne pas en donner — mieux vaut rien qu'un chiffre inventé."
          >
            <Saisie
              type="number"
              inputMode="numeric"
              min={0}
              value={v.price_from_cfa ?? ''}
              onChange={(e) =>
                modifier({ price_from_cfa: e.target.value === '' ? null : Number(e.target.value) })
              }
              placeholder="3000"
            />
          </Champ>

          <Champ
            label="Lien vers son catalogue (facultatif)"
            erreur={erreurs.catalog_url}
            aide="Son Instagram, son catalogue WhatsApp Business, un dossier de photos. Si vous le laissez vide, la fiche montrera les objets saisis dans l'application."
          >
            <Saisie
              type="url"
              inputMode="url"
              value={v.catalog_url ?? ''}
              onChange={(e) => modifier({ catalog_url: e.target.value.trim() || null })}
              placeholder="https://instagram.com/son-compte"
            />
          </Champ>
        </Section>

        <Section titre="Présentation">
          <Champ
            label="Phrase d'accroche"
            aide="Une ligne, visible sur l'accueil. C'est souvent la seule chose qu'on lira."
          >
            <Saisie
              value={v.tagline ?? ''}
              onChange={(e) => modifier({ tagline: e.target.value })}
              placeholder="Beurre de karité et savons, coopérative de 40 femmes"
              maxLength={120}
            />
          </Champ>

          <Champ label="Présentation courte">
            <Zone value={v.bio ?? ''} onChange={(e) => modifier({ bio: e.target.value })} />
          </Champ>

          <Champ label="Histoire de l'atelier" aide="Le récit long, sur la fiche créateur.">
            <Zone value={v.story ?? ''} onChange={(e) => modifier({ story: e.target.value })} />
          </Champ>
        </Section>

        <Section titre="Réglages">
          <Bascule
            label="Accepte les commandes sur mesure"
            coche={v.accepts_custom ?? false}
            onChange={(b) => modifier({ accepts_custom: b })}
          />
          <Bascule
            label="Créateur vérifié"
            aide="Vous l'avez rencontré ou vu ses pièces. Le badge est le principal signal de confiance du site : ne le donnez pas à la légère."
            coche={v.is_verified ?? false}
            onChange={(b) => modifier({ is_verified: b })}
          />
          <Champ label="Visibilité">
            <Segments
              valeur={v.is_active ? 'oui' : 'non'}
              options={[
                ['oui', 'Visible'],
                ['non', 'Masqué'],
              ]}
              onChange={(x) => modifier({ is_active: x === 'oui' })}
            />
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
          {!creation && v.slug && (
            <a
              href={`/createur/${v.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center rounded-full border border-ligne px-5 font-action font-semibold text-encre"
            >
              Voir
            </a>
          )}
        </div>
      </form>

      {/* Les photos ne peuvent partir qu'après création : chaque fichier est
          rangé dans un dossier portant l'identifiant de l'atelier, qui n'existe
          pas tant qu'il n'est pas enregistré. */}
      <Section titre="Photos de l'atelier">
        {creation ? (
          <p className="rounded-xl border border-ligne bg-blanc p-4 text-sm text-second">
            Enregistrez d'abord l'atelier : les photos s'ajoutent ensuite.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {photos?.map((img, i) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl">
                  <Photo
                    chemin={img.storage_path}
                    alt=""
                    source="atelier"
                    className="size-full"
                  />
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-encre/80 px-1.5 py-0.5 font-action text-[10px] font-bold text-blanc">
                      Couverture
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => supprimerPhoto.mutate({ id: img.id, chemin: img.storage_path })}
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
              Trois photos suffisent : l'atelier ou la boutique, une pièce en gros plan, et le
              créateur au travail. La première sert de couverture sur l'annuaire.
            </p>

            {(envoyer.isPending || progres) && (
              <p className="rounded-xl border border-ligne bg-blanc p-3 text-sm text-encre">
                {envoyer.isPending ? (progres ?? 'Préparation…') : progres}
              </p>
            )}
          </>
        )}
      </Section>

      {!creation && id && (
        <ZoneDanger
          titre="Supprimer cet atelier"
          nom={v.display_name ?? 'cet atelier'}
          enCours={supprimerAtelier.isPending}
          erreur={supprimerAtelier.error ? (supprimerAtelier.error as Error).message : null}
          consequences={[
            'La fiche de l’atelier et toutes ses informations',
            `${photos?.length ?? 0} photo${(photos?.length ?? 0) > 1 ? 's' : ''} d’atelier`,
            `${offres?.length ?? 0} offre${(offres?.length ?? 0) > 1 ? 's' : ''} et leurs photos`,
          ]}
          avertissement="Les vues et les clics déjà comptés sont conservés dans vos statistiques globales, mais ne seront plus rattachés à cet atelier. Pour simplement retirer la fiche du site, revenez plus haut et passez la visibilité sur « Masqué »."
          onSupprimer={() => {
            supprimerAtelier.mutate(id, {
              onSuccess: () => navigate('/admin/createurs', { replace: true }),
            })
          }}
        />
      )}
    </main>
  )
}
