import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStats } from '@/hooks/useStats'
import { useSession } from '@/hooks/useAuth'
import { Fraicheur } from '@/components/admin/Fraicheur'
import { supabase } from '@/lib/supabase'

/**
 * Le tableau de bord.
 *
 * Un seul chiffre compte vraiment : la part des vues qui se transforme en clic
 * WhatsApp. En dessous de 5 %, le catalogue ne donne pas envie — c'est le
 * signal qu'il faut retravailler les photos ou les prix, pas recruter plus de
 * créateurs.
 */
export default function Tableau() {
  const [jours, setJours] = useState<7 | 30>(7)
  const { data: lignes, isPending, isError } = useStats(jours)
  const { session } = useSession()

  const vues = lignes?.reduce((s, l) => s + Number(l.views), 0) ?? 0
  const clics = lignes?.reduce((s, l) => s + Number(l.whatsapp_clicks), 0) ?? 0
  const taux = vues > 0 ? (clics / vues) * 100 : null

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
        <Compteur valeur={vues} legende="vues" />
        <Compteur valeur={clics} legende="clics WhatsApp" />
        <Compteur
          valeur={taux === null ? '—' : `${taux.toFixed(1)} %`}
          legende="conversion"
          alerte={taux !== null && taux < 5}
        />
      </div>

      {taux !== null && taux < 5 && vues >= 50 && (
        <p className="mt-3 rounded-xl border border-commande/40 bg-commande/5 p-3 text-sm text-second">
          Moins de 5 % des visiteurs contactent un créateur. Le problème est
          généralement dans les photos ou les prix, rarement dans le nombre d'offres.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Lien vers="/admin/createurs">Créateurs</Lien>
        <Lien vers="/admin/offres">Offres</Lien>
        <Lien vers="/admin/administrateurs">Administrateurs</Lien>
      </div>

      <h2 className="mt-8 font-action text-sm font-bold tracking-wide text-encre">
        Par offre, sur {jours} jours
      </h2>

      {isPending && (
        <div aria-hidden="true" className="mt-3 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-14 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="mt-3 rounded-xl border border-ligne bg-blanc p-4 text-sm text-second">
          Les statistiques n'ont pas pu être chargées.
        </p>
      )}

      {lignes && lignes.length > 0 && (
        <ul className="mt-3 divide-y divide-ligne overflow-hidden rounded-xl border border-ligne bg-blanc">
          {lignes.map((l) => (
            <li key={l.offer_id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-encre">{l.title}</p>
                <p className="truncate text-xs text-second">{l.display_name}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-action text-sm font-bold text-encre">
                  {l.whatsapp_clicks} <span className="font-normal text-second">clics</span>
                </p>
                <p className="font-action text-xs text-second">{l.views} vues</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {lignes && lignes.length === 0 && (
        <p className="mt-3 rounded-xl border border-ligne bg-blanc p-4 text-sm text-second">
          Aucune offre pour l'instant.
        </p>
      )}

      <Fraicheur />

      <p className="mt-8 rounded-xl border border-ligne bg-blanc p-4 text-sm text-second">
        <strong className="text-encre">Un clic n'est pas une vente.</strong> Ces chiffres prouvent
        que des gens ont ouvert WhatsApp, rien de plus. Demandez chaque mois à vos créateurs combien
        de commandes leur sont venues d'ici, et notez la réponse quelque part — sans cette boucle,
        le chiffre ne vaut rien face à quelqu'un qui sait lire.
      </p>
    </main>
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
