import type { EventType } from '@/types/database'

/**
 * LE CŒUR DU PROJET.
 *
 * Au bout d'un mois, les clics WhatsApp enregistrés ici sont la seule donnée
 * de valeur : la preuve chiffrée que la plateforme apporte des clients. C'est
 * l'argument pour recruter des créateurs et pour négocier plus tard.
 *
 * RÈGLE ABSOLUE : un échec de suivi ne doit JAMAIS casser ni ralentir
 * l'interface. Tout est enveloppé, rien n'est attendu, aucune erreur ne
 * remonte à l'écran. Si le réseau tombe, on perd un événement — pas un client.
 *
 * Écrit avec fetch plutôt qu'avec la bibliothèque Supabase pour une raison
 * précise : « keepalive » garantit que la requête part même si le navigateur
 * quitte la page dans la seconde. Or c'est exactement ce qui arrive au clic
 * WhatsApp — l'événement le plus important de tous.
 */

const URL_BASE = import.meta.env.VITE_SUPABASE_URL
const CLE = import.meta.env.VITE_SUPABASE_ANON_KEY

const CLE_SESSION = 'tw_session'

/**
 * Un identifiant par session de navigation, conservé le temps de l'onglet.
 * Il sert à ne pas compter dix fois la même personne qui rafraîchit une fiche :
 * la base refuse les vues en double d'une même session dans la même heure.
 */
function idSession(): string | null {
  try {
    let id = sessionStorage.getItem(CLE_SESSION)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(CLE_SESSION, id)
    }
    return id
  } catch {
    // Navigation privée, stockage refusé : on enregistre sans identifiant
    // plutôt que de ne rien enregistrer du tout.
    return null
  }
}

type Charge = {
  offer_id?: string
  vendor_id?: string
  metadata?: Record<string, unknown>
}

export function trackEvent(type: EventType, charge: Charge = {}): void {
  try {
    // La base limite metadata à 2000 caractères. On tronque ici plutôt que de
    // laisser l'insertion être refusée.
    let metadata = charge.metadata ?? null
    if (metadata && JSON.stringify(metadata).length > 1800) {
      metadata = { tronque: true }
    }

    void fetch(`${URL_BASE}/rest/v1/events`, {
      method: 'POST',
      headers: {
        apikey: CLE,
        Authorization: `Bearer ${CLE}`,
        'Content-Type': 'application/json',
        // On ne veut pas la ligne créée en retour : c'est autant d'octets
        // économisés sur une connexion lente.
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        event_type: type,
        session_id: idSession(),
        offer_id: charge.offer_id ?? null,
        vendor_id: charge.vendor_id ?? null,
        metadata,
      }),
      keepalive: true,
    }).catch(() => {
      // Réseau coupé, doublon refusé par la base, ou n'importe quoi d'autre :
      // c'est sans conséquence pour le visiteur. Silence complet.
    })
  } catch {
    // Silence complet, y compris si fetch lui-même n'existe pas.
  }
}
