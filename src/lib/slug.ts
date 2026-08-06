import { sansAccents } from './texte'

/**
 * Fabrique l'identifiant qui apparaîtra dans l'adresse d'une fiche :
 * « Pagne kenté tissé main » devient « pagne-kente-tisse-main ».
 *
 * Deux exigences, dans cet ordre :
 *
 * 1. Pas d'accent ni d'espace. Une adresse avec des accents se transforme en
 *    suite de %C3%A9 illisible dès qu'elle est collée dans WhatsApp — or c'est
 *    précisément là que ces liens vont circuler.
 *
 * 2. Stable dans le temps. Un lien partagé dans un groupe WhatsApp reste actif
 *    des mois. Changer le titre d'une offre ne doit PAS changer son adresse,
 *    sinon tous les liens déjà envoyés tombent en panne. C'est pourquoi le
 *    formulaire ne recalcule l'identifiant qu'à la création, jamais ensuite.
 */
export function fabriquerSlug(texte: string): string {
  return sansAccents(texte)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // tout le reste devient un tiret
    .replace(/^-+|-+$/g, '') // pas de tiret au début ni à la fin
    .slice(0, 60)
}

/** Le numéro WhatsApp accepté par la base : chiffres uniquement, 8 à 15. */
export function numeroValide(numero: string): boolean {
  return /^[0-9]{8,15}$/.test(numero)
}

/** Retire ce qui traîne souvent dans un numéro recopié : « + », espaces, tirets. */
export function nettoyerNumero(numero: string): string {
  return numero.replace(/[^0-9]/g, '')
}
