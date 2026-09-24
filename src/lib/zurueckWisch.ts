import { useCallback, useEffect, useRef } from 'react'

/**
 * Legt beim Öffnen einer Unteransicht einen Verlaufseintrag an, damit ein
 * Zurück-Wisch auf iPad/iPhone nur diese Ansicht schließt statt die App zu
 * verlassen. Liefert eine Funktion zum Schließen, die denselben Weg nimmt.
 */
export function useZurueckWisch(offen: boolean, schliessen: () => void, kennung: string) {
  const schliessenRef = useRef(schliessen)
  schliessenRef.current = schliessen
  const offenRef = useRef(offen)
  offenRef.current = offen

  useEffect(() => {
    if (offen) window.history.pushState(kennung, '')
  }, [offen, kennung])

  useEffect(() => {
    function beiZurueck() {
      if (offenRef.current) schliessenRef.current()
    }
    window.addEventListener('popstate', beiZurueck)
    return () => window.removeEventListener('popstate', beiZurueck)
  }, [])

  return useCallback(() => {
    if (window.history.state === kennung) window.history.back()
    else schliessenRef.current()
  }, [kennung])
}
