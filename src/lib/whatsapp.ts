import { prix } from './format'
import type { PriceMode } from '@/types/database'

/**
 * La construction des liens WhatsApp.
 *
 * C'est l'unique point de conversion du site : tout le reste n'existe que pour
 * amener ici. Le message doit arriver chez le créateur sans ambiguïté — quel
 * objet, quel prix, et l'adresse de la fiche pour qu'il puisse la rouvrir.
 */

const NOM_APP = import.meta.env.VITE_APP_NAME || 'notre annuaire'
const SITE = import.meta.env.VITE_SITE_URL || window.location.origin

function lien(numero: string, message: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`
}

/** Message pour une offre précise. Adapté au mode de prix. */
export function lienOffre(params: {
  whatsapp_number: string
  titre: string
  price_mode: PriceMode
  price_cfa: number | null
  slug: string
}): string {
  const url = `${SITE}/offre/${params.slug}`

  const message =
    params.price_mode === 'quote'
      ? `Bonjour, je souhaiterais un devis pour ${params.titre}, vu sur ${NOM_APP} : ${url}`
      : `Bonjour, je suis intéressé(e) par ${params.titre} (${prix(params.price_mode, params.price_cfa)}), vu sur ${NOM_APP} : ${url}`

  return lien(params.whatsapp_number, message)
}

/** Message pour un atelier, sans objet particulier. */
export function lienAtelier(params: { whatsapp_number: string; nom: string; slug: string }): string {
  const url = `${SITE}/createur/${params.slug}`
  const message = `Bonjour, j'ai découvert votre atelier ${params.nom} sur ${NOM_APP} : ${url}`
  return lien(params.whatsapp_number, message)
}
