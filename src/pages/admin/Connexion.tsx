import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const NOM_APP = import.meta.env.VITE_APP_NAME || 'Administration'

/**
 * La connexion par lien magique.
 *
 * Pas de mot de passe, donc rien à retenir, rien à voler, et aucun écran de
 * réinitialisation à écrire. On saisit son adresse, on reçoit un lien, on
 * clique. C'est aussi ce qui coûte le moins : zéro franc par connexion, contre
 * 30 à 80 FCFA pour un SMS vers le Togo.
 *
 * Cet écran ne donne aucun droit par lui-même : il ouvre une session. Les
 * droits viennent du rôle inscrit dans user_roles, contrôlé par la base.
 */
export default function Connexion() {
  const [email, setEmail] = useState('')
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'envoye' | 'erreur'>('saisie')
  const [message, setMessage] = useState('')

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    setEtat('envoi')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Où le lien reviendra. Cette adresse doit être déclarée dans Supabase
        // (Authentication → URL Configuration), sinon le lien est refusé.
        emailRedirectTo: `${window.location.origin}/admin`,
        // Personne ne s'inscrit ici : le compte doit exister.
        shouldCreateUser: false,
      },
    })

    if (error) {
      setEtat('erreur')
      setMessage(
        error.message.toLowerCase().includes('signups not allowed')
          ? "Cette adresse n'a pas de compte. Créez-le d'abord dans Supabase, Authentication → Users."
          : error.message,
      )
      return
    }

    setEtat('envoye')
  }

  if (etat === 'envoye') {
    return (
      <Cadre>
        <h1 className="text-xl font-bold text-encre">Regardez vos e-mails</h1>
        <p className="mt-2 text-second">
          Un lien de connexion vient d'être envoyé à <strong className="text-encre">{email}</strong>.
          Il est valable une heure et ne sert qu'une fois.
        </p>
        <p className="mt-4 text-sm text-second">
          Rien reçu ? Vérifiez les indésirables, puis{' '}
          <button
            onClick={() => setEtat('saisie')}
            className="font-semibold text-accent underline"
          >
            recommencez
          </button>
          .
        </p>
      </Cadre>
    )
  }

  return (
    <Cadre>
      <p className="font-action text-xs tracking-widest text-second uppercase">{NOM_APP}</p>
      <h1 className="mt-1 text-xl font-bold text-encre">Administration</h1>
      <p className="mt-2 text-second">
        Saisissez votre adresse. Vous recevrez un lien de connexion — il n'y a pas de mot de passe.
      </p>

      <form onSubmit={(e) => void envoyer(e)} className="mt-6">
        <label htmlFor="email" className="font-action text-sm font-semibold text-encre">
          Adresse e-mail
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
          className="mt-1.5 h-12 w-full rounded-xl border border-ligne bg-blanc px-4 text-encre placeholder:text-second"
        />

        {etat === 'erreur' && (
          <p className="mt-3 rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm text-encre">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={etat === 'envoi'}
          className="mt-4 w-full rounded-full bg-encre px-6 font-action font-bold text-blanc disabled:opacity-50"
        >
          {etat === 'envoi' ? 'Envoi en cours…' : 'Recevoir le lien'}
        </button>
      </form>
    </Cadre>
  )
}

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-ligne bg-blanc p-6">{children}</div>
    </main>
  )
}
