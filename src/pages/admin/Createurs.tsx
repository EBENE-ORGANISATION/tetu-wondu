import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminVendors } from '@/hooks/useAdminVendors'
import { Monogramme } from '@/components/Monogramme'
import { metier } from '@/lib/format'

export default function Createurs() {
  const { data: createurs, isPending, isError } = useAdminVendors()
  const [filtre, setFiltre] = useState('')

  const visibles = createurs?.filter((c) =>
    c.display_name.toLowerCase().includes(filtre.toLowerCase().trim()),
  )

  return (
    <main className="mx-auto max-w-2xl px-5 pt-6 pb-24">
      <Link to="/admin" className="font-action text-sm font-semibold text-accent">
        ‹ Tableau de bord
      </Link>

      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-encre">Créateurs</h1>
        <Link
          to="/admin/createurs/nouveau"
          className="flex shrink-0 items-center rounded-full bg-encre px-5 font-action font-bold text-blanc"
        >
          + Nouveau
        </Link>
      </div>

      <input
        type="search"
        value={filtre}
        onChange={(e) => setFiltre(e.target.value)}
        placeholder="Filtrer par nom…"
        className="mt-4 h-12 w-full rounded-full border border-ligne bg-blanc px-4 text-encre placeholder:text-second"
      />

      {isPending && (
        <div aria-hidden="true" className="mt-4 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-16 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="mt-4 rounded-xl border border-ligne bg-blanc p-4 text-sm text-second">
          La liste n'a pas pu être chargée.
        </p>
      )}

      {visibles && (
        <ul className="mt-4 space-y-2">
          {visibles.map((c) => (
            <li key={c.id}>
              <Link
                to={`/admin/createurs/${c.id}`}
                className="flex items-center gap-3 rounded-xl border border-ligne bg-blanc p-3"
              >
                <Monogramme nom={c.display_name} logoUrl={c.logo_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-encre">{c.display_name}</p>
                  <p className="truncate text-sm text-second">
                    {metier(c.vendor_type)} · {c.city} · {c.offers?.[0]?.count ?? 0} offre
                    {(c.offers?.[0]?.count ?? 0) > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {c.is_verified && <Etiquette ton="accent">Vérifié</Etiquette>}
                  {!c.is_active && <Etiquette ton="gris">Masqué</Etiquette>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {visibles?.length === 0 && (
        <p className="mt-4 rounded-xl border border-ligne bg-blanc p-4 text-sm text-second">
          Aucun créateur ne correspond.
        </p>
      )}
    </main>
  )
}

function Etiquette({ ton, children }: { ton: 'accent' | 'gris'; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-action text-[11px] font-bold ${
        ton === 'accent' ? 'bg-accent text-blanc' : 'bg-ligne text-second'
      }`}
    >
      {children}
    </span>
  )
}
