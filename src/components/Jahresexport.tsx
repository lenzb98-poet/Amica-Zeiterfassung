import { useMemo, useState } from 'react'
import type { Rechnung } from '../lib/typen'
import { erzeugeJahresliste } from '../lib/excelExport'
import { dateiHerunterladen, dateiTeilen, kannDateiTeilen } from '../lib/datei'

export default function Jahresexport({ rechnungen }: { rechnungen: Rechnung[] }) {
  const jahre = useMemo(
    () => [...new Set(rechnungen.map((r) => Number(r.invoice_date.slice(0, 4))))].sort((a, b) => b - a),
    [rechnungen],
  )
  const [gewaehlt, setGewaehlt] = useState<number | null>(null)
  const [arbeitet, setArbeitet] = useState(false)
  const [datei, setDatei] = useState<{ jahr: number; datei: File } | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  if (jahre.length === 0) return null
  const jahr = gewaehlt !== null && jahre.includes(gewaehlt) ? gewaehlt : jahre[0]
  const anzahl = rechnungen.filter((r) => r.invoice_date.startsWith(String(jahr))).length

  // Safari erlaubt das Teilen nur direkt nach einem Tippen. Darum wird die
  // Datei zuerst erstellt und erst mit dem zweiten Tippen geteilt.
  const fertig = datei && datei.jahr === jahr ? datei.datei : null

  async function erstellen() {
    setArbeitet(true)
    setFehler(null)
    try {
      setDatei({ jahr, datei: await erzeugeJahresliste(rechnungen, jahr) })
    } catch {
      setFehler('Die Excel-Datei konnte nicht erstellt werden.')
    }
    setArbeitet(false)
  }

  async function weitergeben() {
    if (!fertig) return
    if (kannDateiTeilen(fertig)) {
      const geklappt = await dateiTeilen(fertig, `Rechnungen ${jahr}`)
      if (!geklappt) setFehler('Teilen hat nicht geklappt.')
    } else {
      dateiHerunterladen(fertig)
    }
  }

  return (
    <div className="karte formular">
      <div>
        <h3>Jahresliste für die Steuer</h3>
        <p className="hinweis">Alle Rechnungen eines Jahres als Excel-Datei.</p>
      </div>
      <div className="export-zeile">
        <label className="field">
          Jahr
          <select value={jahr} onChange={(e) => setGewaehlt(Number(e.target.value))}>
            {jahre.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </label>
        {fertig ? (
          <button type="button" className="primary" onClick={weitergeben}>
            {kannDateiTeilen(fertig) ? 'Excel teilen' : 'Excel herunterladen'}
          </button>
        ) : (
          <button type="button" className="primary" onClick={erstellen} disabled={arbeitet}>
            {arbeitet ? 'Wird erstellt …' : `Excel erstellen (${anzahl} Rechnungen)`}
          </button>
        )}
      </div>
      {fehler && (
        <p className="error" role="alert">
          {fehler}
        </p>
      )}
    </div>
  )
}
