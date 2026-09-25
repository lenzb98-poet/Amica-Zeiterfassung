import { useState } from 'react'
import { dateiHerunterladen, dateiTeilen, kannDateiTeilen } from '../lib/datei'

type Props = {
  titel: string
  beschreibung: string
  /** Ändert sich der Schlüssel (z. B. das Jahr), wird die Datei neu erstellt. */
  schluessel: string
  erzeugen: () => Promise<File>
  deaktiviert?: boolean
}

/**
 * Erst erstellen, dann teilen: Safari erlaubt das Teilen-Menü nur direkt
 * nach einem Tippen, nicht nach einer längeren Wartezeit.
 */
export default function ExportKnopf({ titel, beschreibung, schluessel, erzeugen, deaktiviert }: Props) {
  const [datei, setDatei] = useState<{ schluessel: string; datei: File } | null>(null)
  const [arbeitet, setArbeitet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const fertig = datei && datei.schluessel === schluessel ? datei.datei : null

  async function erstellen() {
    setArbeitet(true)
    setFehler(null)
    try {
      setDatei({ schluessel, datei: await erzeugen() })
    } catch {
      setFehler('Die Datei konnte nicht erstellt werden.')
    }
    setArbeitet(false)
  }

  async function weitergeben() {
    if (!fertig) return
    if (kannDateiTeilen(fertig)) {
      if (!(await dateiTeilen(fertig, titel))) setFehler('Teilen hat nicht geklappt.')
    } else {
      dateiHerunterladen(fertig)
    }
  }

  return (
    <div className="export">
      <div className="export-text">
        <span className="klient-name">{titel}</span>
        <span className="hinweis">{beschreibung}</span>
        {fehler && <span className="error">{fehler}</span>}
      </div>
      {fertig ? (
        <button type="button" className="primary schmal" onClick={weitergeben}>
          {kannDateiTeilen(fertig) ? 'Teilen' : 'Herunterladen'}
        </button>
      ) : (
        <button
          type="button"
          className="ghost schmal"
          onClick={erstellen}
          disabled={arbeitet || deaktiviert}
        >
          {arbeitet ? 'Erstellen …' : 'Excel erstellen'}
        </button>
      )}
    </div>
  )
}
