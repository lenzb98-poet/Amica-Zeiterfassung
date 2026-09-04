import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, missingConfig } from './lib/supabase'
import Login from './components/Login'
import SetupHinweis from './components/SetupHinweis'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (missingConfig.length) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (missingConfig.length) {
    return <SetupHinweis fehlend={missingConfig} />
  }

  if (!ready) {
    return (
      <main className="login">
        <p className="loading">Einen Moment …</p>
      </main>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>Amica Zeiterfassung</h1>
        <button className="ghost" onClick={() => supabase.auth.signOut()}>
          Abmelden
        </button>
      </header>
      <p className="placeholder">
        Angemeldet. Die Zeiterfassung bauen wir als nächsten Schritt.
      </p>
    </main>
  )
}
