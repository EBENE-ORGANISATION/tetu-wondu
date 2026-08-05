import { useEffect, useState } from 'react'

/**
 * Sait si le téléphone a du réseau.
 *
 * Attention à ce que cette information vaut réellement : le navigateur dit
 * seulement s'il existe une connexion, pas si elle fonctionne. Sur une 3G
 * togolaise, on peut être « en ligne » et n'obtenir aucune réponse. C'est
 * pourquoi l'application ne s'appuie jamais uniquement là-dessus : les échecs
 * de requête sont traités séparément, avec leur propre bouton « Réessayer ».
 *
 * Ce que ça sert à faire, en revanche, c'est à dire honnêtement au visiteur
 * pourquoi il voit du contenu d'il y a dix minutes.
 */
export function useEnLigne(): boolean {
  const [enLigne, setEnLigne] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const revenu = () => setEnLigne(true)
    const perdu = () => setEnLigne(false)

    window.addEventListener('online', revenu)
    window.addEventListener('offline', perdu)
    return () => {
      window.removeEventListener('online', revenu)
      window.removeEventListener('offline', perdu)
    }
  }, [])

  return enLigne
}
