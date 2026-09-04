import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Supabase ist nicht konfiguriert. Bitte VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env setzen.',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

/**
 * Die App hat nur einen Benutzer. Deshalb ist die E-Mail fest hinterlegt und
 * im Login wird ausschliesslich das Passwort abgefragt.
 */
export const APP_USER_EMAIL = import.meta.env.VITE_APP_USER_EMAIL
