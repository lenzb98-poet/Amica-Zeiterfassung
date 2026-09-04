import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Zeigt ein Klientenfoto. Der Bucket ist privat, deshalb wird pro Bild ein
 * zeitlich begrenzter Link erzeugt. Ohne Foto erscheinen die Initialen.
 */
export default function Klientenfoto({ pfad, name }: { pfad: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let abgebrochen = false
    setUrl(null)

    if (!pfad) return

    supabase.storage
      .from('client-photos')
      .createSignedUrl(pfad, 60 * 60)
      .then(({ data }) => {
        if (!abgebrochen && data) setUrl(data.signedUrl)
      })

    return () => {
      abgebrochen = true
    }
  }, [pfad])

  if (url) {
    return <img className="klient-foto" src={url} alt={`Foto von ${name}`} />
  }

  return (
    <span className="klient-foto klient-foto-platzhalter" aria-hidden="true">
      {initialen(name)}
    </span>
  )
}

function initialen(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((teil) => teil[0]?.toUpperCase() ?? '')
    .join('')
}
