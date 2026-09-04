import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Klient } from './lib/typen'
import Login from './components/Login'
import Klientenliste from './components/Klientenliste'
import Klientenseite from './components/Klientenseite'

const VERLAUFS_ZUSTAND = 'klient-details'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [offenerKlient, setOffenerKlient] = useState<Klient | null>(null)
  const offenerKlientRef = useRef(offenerKlient)
  offenerKlientRef.current = offenerKlient

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

  useEffect(() => {
    // Ohne eigenen Verlaufseintrag verlässt ein Zurück-Wisch (iPad/iPhone)
    // sofort die ganze Seite. Der Eintrag sorgt dafür, dass ein Wisch
    // zunächst nur die Klientenseite schließt.
    function beiZurueck() {
      if (offenerKlientRef.current) setOffenerKlient(null)
    }

    window.addEventListener('popstate', beiZurueck)
    return () => window.removeEventListener('popstate', beiZurueck)
  }, [])

  const klientOeffnen = useCallback((klient: Klient) => {
    window.history.pushState(VERLAUFS_ZUSTAND, '')
    setOffenerKlient(klient)
  }, [])

  const zurZurListe = useCallback(() => {
    if (window.history.state === VERLAUFS_ZUSTAND) {
      window.history.back()
    } else {
      setOffenerKlient(null)
    }
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
        <Klientenseite klient={offenerKlient} onZurueck={zurZurListe} />
      ) : (
        <Klientenliste onKlientOeffnen={klientOeffnen} />
      )}
    </main>
  )
}
