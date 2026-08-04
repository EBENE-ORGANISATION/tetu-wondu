const URL_BASE = import.meta.env.VITE_SUPABASE_URL

/**
 * L'adresse publique d'une image du bucket « offer-images ».
 *
 * Construite à la main plutôt que via la bibliothèque Supabase : c'est une
 * simple concaténation, inutile de charger du code pour ça. Le bucket est
 * public, donc l'adresse est directement lisible — y compris par le robot de
 * WhatsApp qui fabrique l'aperçu des liens partagés.
 */
export function urlImage(chemin: string): string {
  return `${URL_BASE}/storage/v1/object/public/offer-images/${chemin}`
}
