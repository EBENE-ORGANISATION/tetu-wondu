import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStats, useStatsAteliers } from '@/hooks/useStats'
import { useSession } from '@/hooks/useAuth'
import { Fraicheur } from '@/components/admin/Fraicheur'
import { supabase } from '@/lib/supabase'

/**
 * Le tableau de bord.
 *
 * En phase 1, l'unité comptée est l'atelier, pas l'objet.
 *
 * Un chiffre compte plus que les autres : la part des vues qui se transforme
 * en contact WhatsApp. En dessous de 5 %, le problème est dans les photos ou
 * les prix — pas dans le nombre d'ateliers.
 *
 * Le second à surveiller est nouveau : les départs vers l'extérieur. Un
 * visiteur qui part sur Instagram sort de vos statistiques, et vous ne saurez
 * jamais ce qu'il y fait.
 */
export default function Tableau() {
  const [jours, setJours] = useState<7 | 30>(7)
  const { data: ateliers, isPending, isError } = useStatsAteliers(jours)
  const { data: offres } = useStats(jours)
  const { session } = useSession()

  const somme = (f: (l: NonNullable<typeof ateliers>[number]) => number) =>
    (ateliers ?? []).reduce((s, l) => s + Number(f(l)), 0)

  const vues = somme((l) => l.vues)
  const whatsapp = somme((l) => l.whatsapp)
  const ailleurs = somme((l) => l.catalogue + l.instagram + l.telephone)
  const taux = vues > 0 ? (whatsapp / vues) * 100 : null

  return (
    <main className="mx-auto max-w-2xl px-5 pt-6 pb-16">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-action text-xs tracking-widest text-second uppercase">Administration</p>
          <h1 className="text-2xl font-bold text-encre">Tableau de bord</h1>
        </div>
        <button
          onClick={() => void supabase.auth.signOut()}
          className="shrink-0 font-action text-sm font-semibold text-accent"
        >
          Déconnexion
        </button>
      </div>

      {session && <p className="mt-1 text-sm text-second">{session.user.email}</p>}

      <div className="mt-5 flex gap-2">
        {([7, 30] as const).map((n) => (
          <button
            key={n}
            onClick={() => setJours(n)}
            aria-pressed={jours === n}
            className={`rounded-full border px-4 font-action text-sm font-semibold ${
              jours === n ? 'border-encre bg-encre text-blanc' : 'border-ligne bg-blanc text-encre'
            }`}
          >
            {n} jours
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Compteur valeur={vues} legende="vues d'atelier" />
        <Compteur valeur={whatsapp} legende="contacts WhatsApp" />
        <Compteur
          valeur={taux === null ? '—' : `${taux.toFixed(1)} %`}
          legende="conversion"
          alerte={taux !== null && taux < 5}
        />
      </div>

      {taux !== null && taux < 5 && vues >= 50 && (
        <p className="mt-3 rounded-xl border border-commande/40 bg-commande/5 p-3 text-sm text-second">
          Moins de 5 % des visiteurs contactent un créateur. Le problème est généralement dans les
          photos ou les prix, rarement dans le nombre d'ateliers.
        </p>
      )}

      {/* Les départs vers l'extérieur : la moitié aveugle de vos chiffres. */}
      {ailleurs > 0 && (
        <div className="mt-3 rounded-xl border border-ligne bg-blanc p-3">
          <p className="text-sm text-second">
            <span className="font-action font-bold text-encre">{ailleurs}</span> départ
            {ailleurs > 1 ? 's' : ''} vers l'extérieur — catalogue, Instagram ou téléphone.
          </p>
          {ailleurs > whatsapp && whatsapp + ailleurs >= 20 && (
            <p className="mt-2 text-sm text-second">
              <span className="font-bold text-encre">Plus de départs que de contacts WhatsApp.</span>{' '}
              Ces visiteurs sortent de vos statistiques : vous ne saurez jamais s'ils ont acheté.
              C'est le signal qu'il faudrait ramener les objets dans l'application.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Lien vers="/admin/createurs">Créateurs</Lien>
        <Lien vers="/admin/offres">Offres</Lien>
        <Lien vers="/admin/administrateurs">Administrateurs</Lien>
      </div>

      <h2 className="mt-8 font-action text-sm font-bold tracking-wide text-encre">
        Par atelier, sur {jours} jours
      </h2>

      {isPending && (
        <div aria-hidden="true" className="mt-3 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-16 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="mt-3 rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm text-encre">
          Les statistiques n'ont pas pu être chargées. La migration 0013 a-t-elle été exécutée ?
        </p>
      )}

      {ateliers && ateliers.length > 0 && (
        <ul className="mt-3 space-y-2">
          {ateliers.map((a) => {
            const sorties = a.catalogue + a.instagram + a.telephone
            const tauxAtelier = a.vues > 0 ? (a.whatsapp / a.vues) * 100 : null

            return (
              <li key={a.vendor_id} className="rounded-xl border border-ligne bg-blanc p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate font-medium text-encre">
                    {a.display_name}
                    <span className="font-normal text-second"> · {a.city}</span>
                  </p>
                  {tauxAtelier !== null && (
                    <span
                      className={`shrink-0 font-action text-sm font-bold ${
                        tauxAtelier < 5 ? 'text-commande' : 'text-encre'
                      }`}
                    >
                      {tauxAtelier.toFixed(0)} %
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-action text-xs text-second">
                  <Mesure valeur={a.vues} libelle="vues" />
                  <Mesure valeur={a.whatsapp} libelle="WhatsApp" fort={a.whatsapp > 0} />
                  {a.catalogue > 0 && <Mesure valeur={a.catalogue} libelle="catalogue" />}
                  {a.instagram > 0 && <Mesure valeur={a.instagram} libelle="Instagram" />}
                  {a.telephone > 0 && <Mesure valeur={a.telephone} libelle="appels" />}
                </div>

                {a.vues > 0 && a.whatsapp === 0 && sorties === 0 && (
                  <p className="mt-2 text-xs text-second">
                    Consulté, jamais contacté. Regardez ses photos et son prix de départ.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {ateliers && ateliers.length === 0 && (
        <p className="mt-3 rounded-xl border border-ligne bg-blanc p-4 text-sm text-second">
          Aucun atelier actif pour l'instant.
        </p>
      )}

      {/* Les objets restent comptés pour les créateurs qui en ont saisi. */}
      {offres && offres.some((o) => o.views > 0 || o.whatsapp_clicks > 0) && (
        <>
          <h2 className="mt-8 font-action text-sm font-bold tracking-wide text-encre">
            Par objet, sur {jours} jours
          </h2>
          <ul className="mt-3 divide-y divide-ligne overflow-hidden rounded-xl border border-ligne bg-blanc">
            {offres
              .filter((o) => o.views > 0 || o.whatsapp_clicks > 0)
              .map((o) => (
                <li key={o.offer_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-encre">{o.title}</p>
                    <p className="truncate text-xs text-second">{o.display_name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-action text-sm font-bold text-encre">
                      {o.whatsapp_clicks} <span className="font-normal text-second">clics</span>
                    </p>
                    <p className="font-action text-xs text-second">{o.views} vues</p>
                  </div>
                </li>
              ))}
          </ul>
        </>
      )}

      <Fraicheur />

      <p className="mt-8 rounded-xl border border-ligne bg-blanc p-4 text-sm text-second">
        <strong className="text-encre">Un clic n'est pas une vente.</strong> Ces chiffres prouvent
        que des gens ont ouvert WhatsApp, rien de plus. Demandez chaque mois à vos créateurs combien
        de commandes leur sont venues d'ici, et notez la réponse quelque part — sans cette boucle, le
        chiffre ne vaut rien face à quelqu'un qui sait lire.
      </p>
    </main>
  )
}

function Mesure({
  valeur,
  libelle,
  fort = false,
}: {
  valeur: number
  libelle: string
  fort?: boolean
}) {
  return (
    <span className={fort ? 'text-encre' : undefined}>
      <span className="font-bold">{valeur}</span> {libelle}
    </span>
  )
}

function Compteur({
  valeur,
  legende,
  alerte = false,
}: {
  valeur: number | string
  legende: string
  alerte?: boolean
}) {
  return (
    <div className="rounded-xl border border-ligne bg-blanc p-3">
      <p
        className={`font-action text-2xl leading-none font-bold ${alerte ? 'text-commande' : 'text-encre'}`}
      >
        {valeur}
      </p>
      <p className="mt-1 text-xs text-second">{legende}</p>
    </div>
  )
}

function Lien({ vers, children }: { vers: string; children: React.ReactNode }) {
  return (
    <Link
      to={vers}
      className="flex flex-1 items-center justify-center rounded-full border border-encre bg-blanc px-4 font-action font-semibold text-encre"
    >
      {children}
    </Link>
  )
}
