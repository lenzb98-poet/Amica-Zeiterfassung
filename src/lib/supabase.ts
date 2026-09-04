import { createClient } from '@supabase/supabase-js'

// Diese Werte sind bewusst im Code hinterlegt: die Projekt-URL und der
// "publishable" Key sind für den Browser gedacht und nicht geheim (der
// eigentliche Zugriffsschutz läuft über Supabase Row Level Security).
// So funktioniert der Build auch auf GitHub Pages, ohne dort Secrets
// pflegen zu müssen. Über eine lokale .env lassen sie sich überschreiben.
const DEFAULT_URL = 'https://eafexkyezkymlckfrztk.supabase.co'
const DEFAULT_ANON_KEY = 'sb_publishable_35m9-QrHkksaotEWsS12RQ_cVjTb6RU'
const DEFAULT_APP_USER_EMAIL = 'alltagshilfe@amica.local'

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY

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
export const APP_USER_EMAIL = import.meta.env.VITE_APP_USER_EMAIL || DEFAULT_APP_USER_EMAIL
