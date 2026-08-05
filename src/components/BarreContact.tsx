/**
 * La barre verte ancrée en bas de fiche.
 *
 * C'est l'unique action du site : tout le reste n'existe que pour amener ici.
 * Elle reste visible pendant le défilement, parce qu'un bouton qu'il faut
 * aller chercher est un bouton qu'on ne clique pas.
 *
 * Elle n'ouvre plus WhatsApp directement : elle ouvre la feuille de
 * confirmation, où le visiteur voit et peut corriger le message qui partira.
 *
 * pb-[env(safe-area-inset-bottom)] : évite que le bouton passe sous la barre
 * de navigation des téléphones sans bouton physique.
 */
export function BarreContact({
  libelle,
  rappel,
  onAppuyer,
}: {
  libelle: string
  /** Le prix, rappelé à gauche du bouton. Omis sur une fiche créateur. */
  rappel?: { legende?: string; valeur: string }
  onAppuyer: () => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ligne bg-blanc pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        {rappel && (
          <div className="min-w-0 shrink-0">
            {rappel.legende && (
              <p className="font-action text-[11px] leading-tight text-second">{rappel.legende}</p>
            )}
            <p className="font-action leading-tight font-bold text-encre">{rappel.valeur}</p>
          </div>
        )}

        <button
          onClick={onAppuyer}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-whatsapp px-5 py-3 text-center font-action font-bold text-blanc"
        >
          <svg viewBox="0 0 24 24" className="size-5 shrink-0 fill-current" aria-hidden="true">
            <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.3 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1a14 14 0 0 1-6.4-5.6c-.5-.8-.8-1.7-.8-2.5 0-.9.5-1.5.8-1.7.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2 1.1 1 2 1.3 2.3 1.4.2.1.4.1.6-.1l.7-.8c.2-.2.3-.2.5-.1l2 .9c.2.1.4.2.4.3v.9z" />
          </svg>
          {libelle}
        </button>
      </div>
    </div>
  )
}
