import { useEffect, useRef, useState } from 'react'
import { Monogramme } from '@/components/Monogramme'
import { lienWhatsApp } from '@/lib/whatsapp'

/**
 * La feuille de confirmation avant WhatsApp.
 *
 * POURQUOI CETTE ÉTAPE EN PLUS
 *   Sans elle, le visiteur bascule dans WhatsApp sans avoir vu ce qu'il
 *   s'apprête à envoyer. Beaucoup effacent alors le message pré-rempli — y
 *   compris le lien de la fiche — et le créateur reçoit un « bonjour » seul,
 *   sans savoir de quel objet on parle. C'est la première cause de contact
 *   perdu sur ce genre de plateforme.
 *
 *   Ici, on montre le message, on laisse le modifier, et on part avec.
 *
 * CE QUE ÇA CHANGE DANS LES CHIFFRES
 *   Le clic n'est compté qu'à l'ouverture réelle de WhatsApp, pas à
 *   l'ouverture de la feuille. Le nombre de clics va donc baisser par rapport
 *   à avant — non pas parce qu'il y a moins d'intérêt, mais parce qu'on ne
 *   compte plus les hésitations. Le chiffre devient plus vrai, pas plus bas.
 */
export function FeuilleWhatsApp({
  destinataire,
  objet,
  messageInitial,
  onOuvrir,
  onFermer,
}: {
  destinataire: { nom: string; whatsapp_number: string; logo_url?: string | null }
  /** Absent depuis une fiche créateur : on contacte l'atelier, pas une pièce. */
  objet?: { titre: string; prixAffiche: string }
  messageInitial: string
  onOuvrir: () => void
  onFermer: () => void
}) {
  const [message, setMessage] = useState(messageInitial)
  const [modifiable, setModifiable] = useState(false)
  const zone = useRef<HTMLTextAreaElement>(null)

  // Le clavier n'apparaît qu'à la demande : sur un écran de 5 pouces, il
  // recouvrirait le récapitulatif et le bouton avant même qu'on les ait lus.
  useEffect(() => {
    if (modifiable) zone.current?.focus()
  }, [modifiable])

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }
    document.addEventListener('keydown', auClavier)
    return () => document.removeEventListener('keydown', auClavier)
  }, [onFermer])

  const vide = message.trim().length === 0

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmer le message"
    >
      <button className="absolute inset-0 bg-encre/50" onClick={onFermer} aria-label="Annuler" />

      <div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-creme pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start gap-3 px-5 pt-5">
          <Monogramme nom={destinataire.nom} logoUrl={destinataire.logo_url} />
          <div className="min-w-0 flex-1">
            <p className="leading-tight font-bold text-encre">{destinataire.nom}</p>
            <p className="text-sm text-second">Votre message lui parviendra sur WhatsApp</p>
          </div>
          <button
            onClick={onFermer}
            aria-label="Fermer"
            className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-accent"
          >
            ×
          </button>
        </div>

        {objet && (
          <div className="mx-5 mt-4 rounded-xl border border-ligne bg-blanc px-4 py-3">
            <p className="leading-snug font-medium text-encre">{objet.titre}</p>
            <p className="font-action text-sm font-bold text-accent">{objet.prixAffiche}</p>
          </div>
        )}

        <div className="mt-4 px-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-action text-xs font-bold tracking-widest text-second uppercase">
              Votre message
            </span>
            {!modifiable && (
              <button
                onClick={() => setModifiable(true)}
                className="font-action text-sm font-semibold text-accent"
              >
                Modifier
              </button>
            )}
          </div>

          {modifiable ? (
            <textarea
              ref={zone}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              className="mt-2 w-full rounded-xl border border-ligne bg-blanc p-4 leading-relaxed text-encre"
            />
          ) : (
            <p
              onClick={() => setModifiable(true)}
              className="mt-2 rounded-xl border border-ligne bg-blanc p-4 leading-relaxed whitespace-pre-line text-encre"
            >
              {message}
            </p>
          )}

          {vide && (
            <p className="mt-2 text-sm text-accent">
              Un message vide n'apprendra rien au créateur. Écrivez au moins ce que vous cherchez.
            </p>
          )}
        </div>

        <div className="mt-4 px-5">
          <a
            href={lienWhatsApp(destinataire.whatsapp_number, message)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (vide) {
                e.preventDefault()
                return
              }
              onOuvrir()
              onFermer()
            }}
            aria-disabled={vide}
            className={`flex items-center justify-center gap-2 rounded-full bg-whatsapp px-5 py-3.5 font-action font-bold text-blanc ${
              vide ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            <svg viewBox="0 0 24 24" className="size-5 shrink-0 fill-current" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.3 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1a14 14 0 0 1-6.4-5.6c-.5-.8-.8-1.7-.8-2.5 0-.9.5-1.5.8-1.7.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2 1.1 1 2 1.3 2.3 1.4.2.1.4.1.6-.1l.7-.8c.2-.2.3-.2.5-.1l2 .9c.2.1.4.2.4.3v.9z" />
            </svg>
            Ouvrir WhatsApp
          </a>

          <p className="mt-3 text-center text-sm text-second">
            La conversation se poursuit directement avec le créateur.
            <br />
            Aucun paiement ne passe par ce site.
          </p>
        </div>
      </div>
    </div>
  )
}
