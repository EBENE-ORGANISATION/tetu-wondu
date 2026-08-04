import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdministrateurs, useInviterAdmin, useRevoquerAdmin } from '@/hooks/useAdmins'
import { Champ, Saisie, Section } from '@/components/admin/Champs'

const dateFr = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export default function Administrateurs() {
  const { data: admins, isPending, isError, error } = useAdministrateurs()
  const inviter = useInviterAdmin()
  const revoquer = useRevoquerAdmin()

  const [email, setEmail] = useState('')
  const [aRevoquer, setARevoquer] = useState<{ id: string; email: string } | null>(null)

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    try {
      await inviter.mutateAsync(email.trim())
      setEmail('')
    } catch {
      // Le message d'erreur est affiché plus bas, à partir de l'état de la
      // mutation : rien à faire ici.
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pt-6 pb-24">
      <Link to="/admin" className="font-action text-sm font-semibold text-accent">
        ‹ Tableau de bord
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-encre">Administrateurs</h1>
      <p className="mt-1 text-second">
        Un administrateur peut tout faire ici : créer, modifier et publier des fiches, et voir les
        statistiques. Il n'a en revanche aucun accès à votre tableau de bord Supabase.
      </p>

      <div className="mt-6 space-y-6">
        <Section titre="Inviter quelqu'un">
          <form onSubmit={(e) => void soumettre(e)} className="space-y-3">
            <Champ
              label="Adresse e-mail"
              aide="Elle recevra un lien de connexion. Si un compte existe déjà, il obtiendra simplement les droits."
            >
              <Saisie
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="collaborateur@exemple.com"
              />
            </Champ>

            <button
              type="submit"
              disabled={inviter.isPending}
              className="w-full rounded-full bg-encre px-6 py-3 font-action font-bold text-blanc disabled:opacity-50"
            >
              {inviter.isPending ? 'Envoi…' : "Envoyer l'invitation"}
            </button>
          </form>

          {inviter.isSuccess && (
            <p className="rounded-xl border border-whatsapp/40 bg-whatsapp/5 p-3 text-sm text-encre">
              {inviter.data.message}
            </p>
          )}
          {inviter.isError && (
            <p className="rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm text-encre">
              {(inviter.error as Error).message}
            </p>
          )}
        </Section>

        <Section titre="Qui a les droits">
          {isPending && (
            <div aria-hidden="true" className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="shimmer h-16 rounded-xl" />
              ))}
            </div>
          )}

          {isError && (
            <p className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm text-encre">
              {(error as Error).message}
            </p>
          )}

          {admins && (
            <ul className="space-y-2">
              {admins.map((a) => (
                <li
                  key={a.user_id}
                  className="flex items-center gap-3 rounded-xl border border-ligne bg-blanc p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-encre">
                      {a.email}
                      {a.cest_vous && <span className="text-second"> — vous</span>}
                    </p>
                    <p className="text-xs text-second">
                      {a.jamais_connecte
                        ? `Invité le ${dateFr.format(new Date(a.invite_le))}, jamais connecté`
                        : `Dernière connexion le ${dateFr.format(new Date(a.derniere_connexion!))}`}
                    </p>
                  </div>

                  {!a.cest_vous && (
                    <button
                      onClick={() => setARevoquer({ id: a.user_id, email: a.email })}
                      className="shrink-0 rounded-full border border-ligne px-3 py-1.5 font-action text-xs font-semibold text-encre"
                    >
                      Retirer
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {revoquer.isError && (
            <p className="rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm text-encre">
              {(revoquer.error as Error).message}
            </p>
          )}
        </Section>
      </div>

      {/* Retirer des droits est une action qu'on ne fait pas par mégarde en
          effleurant l'écran : on demande confirmation, en nommant la personne. */}
      {aRevoquer && (
        <div className="fixed inset-0 z-30 flex items-end justify-center">
          <button
            className="absolute inset-0 bg-encre/40"
            onClick={() => setARevoquer(null)}
            aria-label="Annuler"
          />
          <div className="relative w-full max-w-md rounded-t-3xl bg-creme p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <h2 className="text-lg font-bold text-encre">Retirer les droits ?</h2>
            <p className="mt-2 text-second">
              <strong className="text-encre">{aRevoquer.email}</strong> ne pourra plus accéder au
              back-office. Son compte reste actif, et vous pourrez lui redonner les droits à tout
              moment.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setARevoquer(null)}
                className="flex-1 rounded-full border border-ligne px-5 py-3 font-action font-semibold text-encre"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  revoquer.mutate(aRevoquer.id)
                  setARevoquer(null)
                }}
                className="flex-1 rounded-full bg-accent px-5 py-3 font-action font-bold text-blanc"
              >
                Retirer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
