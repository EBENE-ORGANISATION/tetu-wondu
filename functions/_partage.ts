/**
 * Fabrication des aperçus de liens partagés.
 *
 * LE PROBLÈME QUE ÇA RÉSOUT
 *   Le robot de WhatsApp n'exécute pas de JavaScript. Sur une application React
 *   ordinaire, il ne voit donc que le index.html d'origine : chaque lien
 *   partagé afficherait le même aperçu générique, sans photo ni titre. Or une
 *   grande part de la fréquentation viendra de liens collés dans des groupes.
 *
 * COMMENT
 *   Ce code tourne sur les serveurs de Cloudflare, AVANT que la page ne parte.
 *   Il va chercher l'offre ou le créateur dans Supabase, réécrit les balises du
 *   fichier HTML au vol, puis le sert. Le robot reçoit un fichier déjà complet ;
 *   le visiteur humain, lui, reçoit exactement la même chose et l'application
 *   démarre normalement par-dessus.
 *
 * NE PAS DÉPLACER CE DOSSIER : Cloudflare Pages ne reconnaît les fonctions que
 * sous « functions/ » à la racine du dépôt. Les fichiers commençant par « _ »
 * ne deviennent pas des adresses : celui-ci n'est qu'une boîte à outils.
 */

export interface Env {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  VITE_APP_NAME?: string
}

/** Empêche qu'un titre contenant « " » ou « < » ne casse le HTML produit. */
export function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Coupe proprement une description trop longue pour un aperçu. */
export function resumer(texte: string | null | undefined, taille = 160): string {
  if (!texte) return ''
  const propre = texte.replace(/\s+/g, ' ').trim()
  if (propre.length <= taille) return propre
  return propre.slice(0, taille - 1).replace(/\s\S*$/, '') + '…'
}

/** Les mêmes règles d'affichage des prix que dans l'application. */
export function prix(mode: string, cfa: number | null): string {
  if (mode === 'quote' || cfa === null) return 'Sur devis'
  const montant = new Intl.NumberFormat('fr-FR').format(cfa) + ' FCFA'
  return mode === 'from' ? `À partir de ${montant}` : montant
}

/**
 * Interroge Supabase en rapportant ce qui s'est passé.
 *
 * Le code HTTP est remonté volontairement : un aperçu vide peut venir d'une
 * clé refusée (401), d'une adresse fausse (404) ou d'une fiche qui n'existe
 * pas (406). Trois causes, trois corrections différentes, et exactement le
 * même symptôme à l'écran. Sans le code, on cherche à l'aveugle.
 */
export async function interrogerSupabase<T>(
  env: Env,
  chemin: string,
): Promise<{ donnee: T | null; statut: number | string }> {
  try {
    const reponse = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${chemin}`, {
      headers: {
        apikey: env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
        Accept: 'application/vnd.pgrst.object+json',
      },
    })
    if (!reponse.ok) return { donnee: null, statut: reponse.status }
    return { donnee: (await reponse.json()) as T, statut: 200 }
  } catch {
    // Réseau injoignable depuis Cloudflare : cas rare, mais qu'on ne veut pas
    // confondre avec une fiche absente.
    return { donnee: null, statut: 'reseau' }
  }
}

export function urlImage(env: Env, chemin: string): string {
  return `${env.VITE_SUPABASE_URL}/storage/v1/object/public/offer-images/${chemin}`
}

export interface Apercu {
  titre: string
  description: string
  image?: string
  url: string
}

/**
 * Réécrit les balises de l'index.html.
 *
 * On remplace le contenu des balises existantes plutôt que d'en ajouter :
 * deux balises og:title dans la même page donnent un résultat imprévisible
 * selon le robot qui la lit.
 */
export function reecrire(reponse: Response, apercu: Apercu): Response {
  const set = (attribut: string, valeur: string) => ({
    element(e: { setAttribute: (n: string, v: string) => void }) {
      e.setAttribute(attribut, valeur)
    },
  })

  let html = new HTMLRewriter()
    .on('title', {
      element(e) {
        e.setInnerContent(apercu.titre)
      },
    })
    .on('meta[name="description"]', set('content', apercu.description))
    .on('meta[property="og:title"]', set('content', apercu.titre))
    .on('meta[property="og:description"]', set('content', apercu.description))
    .on('meta[property="og:url"]', set('content', apercu.url))
    .on('meta[property="og:type"]', set('content', 'website'))

  if (apercu.image) {
    html = html.on('meta[property="og:image"]', set('content', apercu.image))
  }

  const sortie = html.transform(reponse)
  const entetes = new Headers(sortie.headers)
  entetes.set('Content-Type', 'text/html; charset=utf-8')
  entetes.set('x-apercu', 'ok')
  // Cinq minutes de cache : assez pour absorber un partage viral, assez court
  // pour qu'une correction de prix se voie dans la journée.
  entetes.set('Cache-Control', 'public, max-age=300')

  return new Response(sortie.body, { status: 200, headers: entetes })
}

/** Récupère le index.html compilé, celui que Vite a produit. */
export function pageDeBase(context: {
  env: { ASSETS: { fetch: (r: Request | string | URL) => Promise<Response> } }
  request: Request
}): Promise<Response> {
  return context.env.ASSETS.fetch(new URL('/index.html', context.request.url))
}

/**
 * Sert la page sans la modifier, mais en disant pourquoi.
 *
 * Sans cet en-tête, une page servie telle quelle est indiscernable d'une page
 * que la fonction n'a jamais touchée : le symptôme est le même — un aperçu
 * générique — alors que les causes sont opposées. On perd un temps fou à
 * chercher du mauvais côté.
 *
 * Consultable avec les outils de développement du navigateur, onglet Réseau.
 */
export function servirTelQuel(page: Response, raison: string): Response {
  const entetes = new Headers(page.headers)
  entetes.set('x-apercu', raison)
  return new Response(page.body, { status: page.status, headers: entetes })
}
