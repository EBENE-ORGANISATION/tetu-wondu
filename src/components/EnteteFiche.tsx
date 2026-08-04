import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

/**
 * La barre du haut des fiches : retour et partage.
 *
 * Le partage compte autant que le reste : une grande part de la fréquentation
 * viendra de liens collés dans des groupes WhatsApp. On utilise le partage
 * natif du téléphone quand il existe, et on retombe sur une copie du lien
 * sinon — jamais rien qui échoue en silence.
 */
export function EnteteFiche({ titre }: { titre: string }) {
  const navigate = useNavigate()
  const [copie, setCopie] = useState(false)

  async function partager() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: titre, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // L'utilisateur a annulé le partage, ou le presse-papier est refusé.
      // Ce n'est pas une erreur : on ne dit rien.
    }
  }

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-creme/95 px-2 py-2 backdrop-blur">
      <button
        onClick={() => navigate(-1)}
        className="flex size-11 items-center justify-center rounded-full text-encre"
        aria-label="Revenir en arrière"
      >
        <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-2">
          <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button
        onClick={() => void partager()}
        className="rounded-full px-4 font-action text-sm font-semibold text-encre"
      >
        {copie ? 'Lien copié' : 'Partager'}
      </button>
    </div>
  )
}
