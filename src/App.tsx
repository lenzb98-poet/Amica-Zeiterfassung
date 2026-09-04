import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Klient } from './lib/typen'
import Login from './components/Login'
import Klientenliste from './components/Klientenliste'
import Klientenseite from './components/Klientenseite'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [offenerKlient, setOffenerKlient] = useState<Klient | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) setOffenerKlient(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

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

      {offenerKlient ? (
        <Klientenseite klient={offenerKlient} onZurueck={() => setOffenerKlient(null)} />
      ) : (
        <Klientenliste onKlientOeffnen={setOffenerKlient} />
      )}
    </main>
  )
}
