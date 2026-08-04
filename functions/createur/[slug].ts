import {
  echapper,
  interrogerSupabase,
  pageDeBase,
  reecrire,
  resumer,
  urlImage,
  type Env,
} from '../_partage'

interface AtelierPartage {
  display_name: string
  tagline: string | null
  bio: string | null
  city: string
  neighborhood: string | null
  logo_url: string | null
  cover_url: string | null
  offers: { offer_images: { storage_path: string; sort_order: number }[] }[]
}

/**
 * Aperçu d'une fiche créateur — /createur/{slug}
 *
 * L'image posée demande un peu de soin : un atelier n'a le plus souvent ni
 * bandeau ni logo au début. On prend donc, dans l'ordre, sa couverture, son
 * logo, puis à défaut la photo d'une de ses pièces — ce qui vaut toujours
 * mieux qu'un aperçu vide.
 */
export const onRequestGet: PagesFunction<Env & { ASSETS: Fetcher }> = async (context) => {
  const page = await pageDeBase(context)
  const slug = String(context.params.slug ?? '')
  if (!slug) return page

  const atelier = await interrogerSupabase<AtelierPartage>(
    context.env,
    `vendors?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=` +
      'display_name,tagline,bio,city,neighborhood,logo_url,cover_url,' +
      'offers(offer_images(storage_path,sort_order))',
  )

  if (!atelier) return page

  const nomApp = context.env.VITE_APP_NAME || 'TETU WONDU'
  const lieu = atelier.neighborhood ? `${atelier.city}, ${atelier.neighborhood}` : atelier.city

  const premierePiece = atelier.offers
    ?.flatMap((o) => o.offer_images ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)[0]

  const image =
    atelier.cover_url ??
    atelier.logo_url ??
    (premierePiece ? urlImage(context.env, premierePiece.storage_path) : undefined)

  return reecrire(page, {
    titre: echapper(`${atelier.display_name} — ${lieu} · ${nomApp}`),
    description: echapper(resumer(atelier.tagline || atelier.bio || `Créateur à ${lieu}.`)),
    image,
    url: new URL(context.request.url).href,
  })
}
