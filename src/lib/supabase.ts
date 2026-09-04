import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Fehlende Werte werden in der Oberfläche gemeldet, nicht als weiße Seite. */
export const missingConfig: string[] = [
  ...(url ? [] : ['VITE_SUPABASE_URL']),
  ...(anonKey ? [] : ['VITE_SUPABASE_ANON_KEY']),
  ...(import.meta.env.VITE_APP_USER_EMAIL ? [] : ['VITE_APP_USER_EMAIL']),
]

export const supabase: SupabaseClient = missingConfig.length
  ? (null as unknown as SupabaseClient)
  : createClient(url, anonKey, {
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
