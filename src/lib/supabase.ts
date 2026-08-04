import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !cle) {
  throw new Error(
    "Configuration manquante : VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY est vide dans .env. " +
      'Copiez .env.example en .env et renseignez les deux valeurs (Supabase → Project Settings → API).',
  )
}

if (url.includes('/rest/')) {
  throw new Error(
    "VITE_SUPABASE_URL doit être l'adresse racine du projet (https://xxxx.supabase.co), " +
      "sans « /rest/v1/ » à la fin. La bibliothèque ajoute elle-même ce qu'il faut.",
  )
}

export const supabase = createClient(url, cle)
