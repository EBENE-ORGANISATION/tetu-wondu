/**
 * Les briques de formulaire du back-office.
 *
 * Réunies ici pour une raison pratique : ces écrans sont remplis au pouce, sur
 * le terrain, souvent en plein soleil. Champs hauts, libellés lisibles, aides
 * sous le champ plutôt qu'en infobulle — une infobulle ne s'ouvre pas au doigt.
 */

export function Champ({
  label,
  aide,
  erreur,
  obligatoire,
  children,
}: {
  label: string
  aide?: string
  erreur?: string
  obligatoire?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="font-action text-sm font-semibold text-encre">
        {label}
        {obligatoire && <span className="text-accent"> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {erreur ? (
        <span className="mt-1 block text-sm text-accent">{erreur}</span>
      ) : (
        aide && <span className="mt-1 block text-sm text-second">{aide}</span>
      )}
    </label>
  )
}

const styleSaisie =
  'w-full rounded-xl border border-ligne bg-blanc px-4 py-3 text-encre placeholder:text-second'

export function Saisie(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={styleSaisie} />
}

export function Zone(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${styleSaisie} min-h-24`} />
}

export function Liste(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={styleSaisie} />
}

/**
 * Un choix parmi trois ou quatre, en boutons côte à côte.
 *
 * Préféré à une liste déroulante quand le choix commande l'affichage d'autres
 * champs : on voit d'un coup d'œil dans quel cas on se trouve, sans dérouler.
 */
export function Segments<T extends string>({
  valeur,
  options,
  onChange,
}: {
  valeur: T
  options: [T, string][]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-2">
      {options.map(([v, libelle]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={valeur === v}
          className={`flex-1 rounded-xl border px-3 py-3 font-action text-sm font-semibold ${
            valeur === v ? 'border-encre bg-encre text-blanc' : 'border-ligne bg-blanc text-encre'
          }`}
        >
          {libelle}
        </button>
      ))}
    </div>
  )
}

export function Bascule({
  label,
  aide,
  coche,
  onChange,
}: {
  label: string
  aide?: string
  coche: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-ligne bg-blanc px-4 py-3">
      <span className="min-w-0">
        <span className="block font-action text-sm font-semibold text-encre">{label}</span>
        {aide && <span className="mt-0.5 block text-sm text-second">{aide}</span>}
      </span>
      <input
        type="checkbox"
        checked={coche}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-6 shrink-0 accent-[var(--color-accent)]"
      />
    </label>
  )
}

export function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-action text-xs font-bold tracking-widest text-second uppercase">
        {titre}
      </h2>
      {children}
    </section>
  )
}
