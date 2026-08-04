import {
  echapper,
  interrogerSupabase,
  pageDeBase,
  prix,
  reecrire,
  resumer,
  servirTelQuel,
  urlImage,
  type Env,
} from '../_partage'

interface OffrePartagee {
  title: string
  description: string | null
  price_mode: string
  price_cfa: number | null
  is_made_to_order: boolean
  lead_time_days: number | null
  vendor_display_name: string | null
  origin_city: string | null
  offer_images: { storage_path: string; sort_order: number }[]
}

/**
 * Aperçu d'une fiche offre — /offre/{slug}
 *
 * Ce que verra quelqu'un à qui on colle le lien dans WhatsApp :
 *   [photo]
 *   Pagne kenté tissé main, 6 yards — À partir de 25 000 FCFA
 *   Atelier Tissage Notsé, Notsé · Sur commande, 14 jours
 */
export const onRequestGet: PagesFunction<Env & { ASSETS: Fetcher }> = async (context) => {
  const page = await pageDeBase(context)
  const slug = String(context.params.slug ?? '')
  if (!slug) return servirTelQuel(page, 'sans-slug')

  // Cause la plus fréquente d'un aperçu vide : les variables n'ont pas été
  // renseignées côté Cloudflare, ou l'ont été après le dernier déploiement.
  if (!context.env.VITE_SUPABASE_URL || !context.env.VITE_SUPABASE_ANON_KEY) {
    return servirTelQuel(page, 'variables-manquantes')
  }

  const { donnee: offre, statut } = await interrogerSupabase<OffrePartagee>(
    context.env,
    `offers?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=` +
      'title,description,price_mode,price_cfa,is_made_to_order,lead_time_days,' +
      'vendor_display_name,origin_city,offer_images(storage_path,sort_order)',
  )

  // Offre inexistante, retirée, ou Supabase injoignable : on sert la page telle
  // quelle. L'application affichera « Cet objet n'est plus en ligne ». Un aperçu
  // manquant vaut mieux qu'une page en panne.
  if (!offre) return servirTelQuel(page, `offre-introuvable-${statut}`)

  const nomApp = context.env.VITE_APP_NAME || 'TETU WONDU'
  const photo = offre.offer_images?.sort((a, b) => a.sort_order - b.sort_order)[0]

  const morceaux = [
    offre.vendor_display_name,
    offre.origin_city,
    offre.is_made_to_order && offre.lead_time_days
      ? `Sur commande, ${offre.lead_time_days} jours`
      : null,
  ].filter(Boolean)

  const description = resumer(
    offre.description ? `${morceaux.join(' · ')} — ${offre.description}` : morceaux.join(' · '),
  )

  return reecrire(page, {
    titre: echapper(`${offre.title} — ${prix(offre.price_mode, offre.price_cfa)} · ${nomApp}`),
    description: echapper(description),
    image: photo ? urlImage(context.env, photo.storage_path) : undefined,
    url: new URL(context.request.url).href,
  })
}
