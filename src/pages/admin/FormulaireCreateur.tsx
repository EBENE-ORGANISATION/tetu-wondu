import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useVendor, useEnregistrerVendor } from '@/hooks/useAdminVendors'
import { Champ, Saisie, Zone, Liste, Bascule, Section, Segments } from '@/components/admin/Champs'
import { fabriquerSlug, nettoyerNumero, numeroValide } from '@/lib/slug'
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
}

export default function FormulaireCreateur() {
  const { id } = useParams<{ id: string }>()
  const creation = id === 'nouveau'
  const navigate = useNavigate()

  const { data: existant, isPending } = useVendor(id)
  const enregistrer = useEnregistrerVendor()

  const [v, setV] = useState<Brouillon>(VIDE)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  useEffect(() => {
    if (existant) setV(existant)
  }, [existant])

  const modifier = (bout: Brouillon) => setV((ancien) => ({ ...ancien, ...bout }))

  function valider(): boolean {
    const e: Record<string, string> = {}
    if (!v.display_name?.trim()) e.display_name = 'Le nom est obligatoire.'
    if (!v.city?.trim()) e.city = 'La ville est obligatoire.'

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
    </main>
  )
}
