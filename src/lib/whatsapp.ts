import { prix } from './format'
import type { PriceMode } from '@/types/database'

/**
 * La construction des messages WhatsApp.
 *
 * C'est l'unique point de conversion du site : tout le reste n'existe que pour
 * amener ici. Le message doit arriver chez le créateur sans ambiguïté — quel
 * objet, quel prix, et l'adresse de la fiche pour qu'il puisse la rouvrir.
 *
 * Le texte et le lien sont séparés volontairement : le visiteur peut modifier
 * son message avant l'envoi, et le lien se refabrique à chaque frappe.
 */

const NOM_APP = import.meta.env.VITE_APP_NAME || 'notre annuaire'
const SITE = import.meta.env.VITE_SITE_URL || window.location.origin

/** Le lien wa.me, à partir d'un message déjà rédigé. */
export function lienWhatsApp(numero: string, message: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`
}

/**
 * Le brouillon proposé pour une offre.
 *
 * Rédigé à la première personne, poli, et surtout complet : le créateur reçoit
 * souvent des dizaines de messages par jour, il ne doit pas avoir à demander
 * de quel objet on parle.
 */
export function messageOffre(params: {
  titre: string
  price_mode: PriceMode
  price_cfa: number | null
  slug: string
  contact_name?: string | null
  is_customizable?: boolean
}): string {
  const url = `${SITE}/offre/${params.slug}`
  const bonjour = params.contact_name ? `Bonjour ${params.contact_name}` : 'Bonjour'

  const lignes = [
    params.price_mode === 'quote'
      ? `${bonjour}, je souhaiterais un devis pour « ${params.titre} », vu sur ${NOM_APP}.`
      : `${bonjour}, je suis intéressé(e) par « ${params.titre} » (${prix(params.price_mode, params.price_cfa)}), vu sur ${NOM_APP}.`,
  ]

  // Sur un objet personnalisable, la première question du créateur sera
  // toujours « vous le voulez comment ? ». Autant ouvrir la porte tout de suite.
  if (params.is_customizable) {
    lignes.push('Je souhaiterais le personnaliser — voici ce que j’aimerais :')
  }

  lignes.push(url)
  return lignes.join('\n\n')
}

/** Le brouillon proposé pour un atelier, sans objet particulier. */
export function messageAtelier(params: {
  nom: string
  slug: string
  contact_name?: string | null
}): string {
  const url = `${SITE}/createur/${params.slug}`
  const bonjour = params.contact_name ? `Bonjour ${params.contact_name}` : 'Bonjour'
  return `${bonjour}, j’ai découvert votre atelier « ${params.nom} » sur ${NOM_APP} et j’aimerais en savoir plus.\n\n${url}`
}
