import { useState } from 'react'
import { useExpiration } from '@/hooks/useExpiration'
import { lienWhatsApp } from '@/lib/whatsapp'

const NOM_APP = import.meta.env.VITE_APP_NAME || 'la plateforme'

/**
 * La fraîcheur du catalogue, vue depuis le tableau de bord.
 *
 * Le programme hebdomadaire fait ce travail tout seul. Ce bloc sert à le
 * regarder faire avant de lui faire confiance — et à rattraper à la main
 * quand on veut nettoyer sans attendre le prochain passage.
 *
 * La simulation est proposée en premier, volontairement : dépublier vingt
 * fiches par surprise se répare, mais se remarque.
 */
export function Fraicheur() {
  const verifier = useExpiration()
  const [confirmation, setConfirmation] = useState(false)
  const rapport = verifier.data

  return (
    <section className="mt-8 rounded-2xl border border-ligne bg-blanc p-4">
      <h2 className="font-action text-sm font-bold tracking-wide text-encre">
        Fraîcheur du catalogue
      </h2>
      <p className="mt-1 text-sm text-second">
        Une fiche non confirmée depuis 60 jours repasse en brouillon. Elle disparaît du site sans
        être supprimée, et se republie d'un clic après vérification.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setConfirmation(false)
            verifier.mutate(true)
          }}
          disabled={verifier.isPending}
          className="rounded-full border border-encre px-4 py-2 font-action text-sm font-semibold text-encre disabled:opacity-50"
        >
          {verifier.isPending ? 'Vérification…' : 'Voir ce qui expirerait'}
        </button>

        {rapport?.simulation && rapport.concernees > 0 && !confirmation && (
          <button
            onClick={() => setConfirmation(true)}
            className="rounded-full bg-encre px-4 py-2 font-action text-sm font-bold text-blanc"
          >
            Dépublier ces {rapport.concernees} fiche{rapport.concernees > 1 ? 's' : ''}
          </button>
        )}

        {confirmation && (
          <button
            onClick={() => {
              setConfirmation(false)
              verifier.mutate(false)
            }}
            className="rounded-full bg-accent px-4 py-2 font-action text-sm font-bold text-blanc"
          >
            Confirmer la dépublication
          </button>
        )}
      </div>

      {verifier.isError && (
        <p className="mt-3 rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm text-encre">
          {(verifier.error as Error).message}
        </p>
      )}

      {rapport && (
        <div className="mt-3">
          <p
            className={`rounded-xl p-3 text-sm ${
              rapport.concernees === 0
                ? 'border border-whatsapp/40 bg-whatsapp/5 text-encre'
                : 'border border-commande/40 bg-commande/10 text-encre'
            }`}
          >
            {rapport.message}
          </p>

          {rapport.offres.length > 0 && (
            <ul className="mt-3 divide-y divide-ligne overflow-hidden rounded-xl border border-ligne">
              {rapport.offres.map((o) => (
                <li key={o.slug} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-encre">{o.titre}</span>
                  <span className="shrink-0 font-action text-xs text-second">{o.jours} j</span>
                </li>
              ))}
            </ul>
          )}

          {/* Le vrai travail n'est pas de dépublier : c'est de rappeler.
              Un message par créateur, pas un par fiche. */}
          {rapport.createurs_a_rappeler.length > 0 && (
            <>
              <h3 className="mt-4 font-action text-xs font-bold tracking-widest text-second uppercase">
                Créateurs à rappeler
              </h3>
              <ul className="mt-2 space-y-2">
                {rapport.createurs_a_rappeler.map((c) => (
                  <li
                    key={c.whatsapp}
                    className="flex items-center gap-3 rounded-xl border border-ligne px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-encre">{c.nom}</p>
                      <p className="truncate text-xs text-second">
                        {c.offres.length} fiche{c.offres.length > 1 ? 's' : ''} — {c.offres.join(', ')}
                      </p>
                    </div>
                    <a
                      href={lienWhatsApp(
                        c.whatsapp,
                        `Bonjour ${c.contact ?? c.nom}, ici ${NOM_APP}. Vos fiches n'ont pas été confirmées depuis un moment : ${c.offres.join(', ')}. Sont-elles toujours d'actualité, et vos prix tiennent-ils ? Combien de commandes vous sont venues de la plateforme ce mois-ci ?`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-full bg-whatsapp px-3 py-1.5 font-action text-xs font-bold text-blanc"
                    >
                      Écrire
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  )
}
