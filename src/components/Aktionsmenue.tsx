import { useEffect, useRef, useState } from 'react'

type Props = {
  /** Beschriftung für Screenreader, z. B. "Aktionen für Erika Mustermann". */
  label: string
  onLoeschen: () => void
}

/**
 * Drei-Punkte-Menü, das eine "Löschen"-Aktion verbirgt, damit sie nicht
 * versehentlich angetippt wird.
 */
export default function Aktionsmenue({ label, onLoeschen }: Props) {
  const [offen, setOffen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!offen) return

    function aussenKlick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOffen(false)
      }
    }

    document.addEventListener('mousedown', aussenKlick)
    return () => document.removeEventListener('mousedown', aussenKlick)
  }, [offen])

  return (
    <div className="aktionsmenue" ref={containerRef}>
      <button
        type="button"
        className="aktionsmenue-knopf"
        aria-label={label}
        aria-expanded={offen}
        onClick={() => setOffen((wert) => !wert)}
      >
        ⋮
      </button>

      {offen && (
        <div className="aktionsmenue-liste" role="menu">
          <button
            type="button"
            role="menuitem"
            className="aktionsmenue-eintrag loeschen"
            onClick={() => {
              setOffen(false)
              onLoeschen()
            }}
          >
            Löschen
          </button>
        </div>
      )}
    </div>
  )
}
