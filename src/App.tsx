import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Klient } from './lib/typen'
import Login from './components/Login'
import Klientenliste from './components/Klientenliste'
import Klientenseite from './components/Klientenseite'
import Modulleiste, { type Modul } from './components/Modulleiste'
import Rechnungen from './components/Rechnungen'
import Steuern from './components/Steuern'
import Branding from './components/Branding'

const VERLAUFS_ZUSTAND = 'klient-details'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [modul, setModul] = useState<Modul>('zeiterfassung')
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

  const modulWechseln = useCallback((neuesModul: Modul) => {
    setModul(neuesModul)
    setOffenerKlient(null)
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
        <h1 className="visuell-versteckt">Amica Zeiterfassung</h1>
        <Branding />
        <button className="ghost abmelden" onClick={() => supabase.auth.signOut()}>
          Abmelden
        </button>
      </header>

      <Modulleiste aktiv={modul} onWechseln={modulWechseln} />

      {modul === 'rechnungen' ? (
        <Rechnungen />
      ) : modul === 'steuern' ? (
        <Steuern />
      ) : offenerKlient ? (
        <Klientenseite klient={offenerKlient} onZurueck={zurZurListe} />
      ) : (
        <Klientenliste onKlientOeffnen={klientOeffnen} />
      )}
    </main>
  )
}
