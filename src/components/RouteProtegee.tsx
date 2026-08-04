import { useEstAdmin } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Connexion from '@/pages/admin/Connexion'

/**
 * La porte du back-office.
 *
 * Attention à ne pas se méprendre sur ce que fait ce composant : il cache des
 * écrans, il ne protège pas des données. Quelqu'un qui trafiquerait le
 * JavaScript de son navigateur verrait les écrans — et se ferait refuser
 * chaque lecture et chaque écriture par la base, qui est le seul rempart réel.
 *
 * C'est voulu : la sécurité côté navigateur n'existe pas.
 */
export function RouteProtegee({ children }: { children: React.ReactNode }) {
  const { session, estAdmin, chargement } = useEstAdmin()

  if (chargement) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <div aria-hidden="true" className="w-full max-w-md space-y-3">
          <div className="shimmer h-6 w-1/3 rounded" />
          <div className="shimmer h-32 rounded-2xl" />
        </div>
      </main>
    )
  }

  if (!session) return <Connexion />

  if (!estAdmin) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
        <h1 className="text-xl font-bold text-encre">Compte sans droits d'administration</h1>
        <p className="mt-2 text-second">
          Vous êtes connecté en tant que <strong className="text-encre">{session.user.email}</strong>,
          mais ce compte n'a pas le rôle administrateur.
        </p>
        <p className="mt-4 rounded-xl border border-ligne bg-blanc p-4 text-left text-sm text-second">
          Pour vous l'attribuer, exécutez ceci une fois dans l'éditeur SQL de Supabase :
          <code className="mt-2 block break-all text-encre">
            insert into public.user_roles (user_id, role) values ('{session.user.id}', 'admin');
          </code>
        </p>
        <button
          onClick={() => void supabase.auth.signOut()}
          className="mt-5 self-center rounded-full border border-ligne px-6 font-action font-semibold text-encre"
        >
          Se déconnecter
        </button>
      </main>
    )
  }

  return <>{children}</>
}
