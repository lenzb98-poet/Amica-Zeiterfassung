import { useEffect, useState } from 'react'
import type { Rechnung } from '../lib/typen'
import { erzeugeRechnungsPdf, pdfDateiname } from '../lib/rechnungPdf'
import PdfVorschau from './PdfVorschau'
import { dateiHerunterladen, dateiTeilen, kannDateiTeilen } from '../lib/datei'

type Props = {
  rechnung: Rechnung
  onZurueck: () => void
  onStatusUmschalten: () => void
}

export default function RechnungAnsicht({ rechnung, onZurueck, onStatusUmschalten }: Props) {
  const [pdf, setPdf] = useState<File | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  // Der Status steht nicht auf der Rechnung, daher nur bei neuer Rechnung neu erzeugen.
  useEffect(() => {
    let abgebrochen = false
    setPdf(null)
    setFehler(null)
    erzeugeRechnungsPdf(rechnung)
      .then((blob) => {
        if (!abgebrochen) {
          setPdf(new File([blob], pdfDateiname(rechnung), { type: 'application/pdf' }))
        }
      })
      .catch(() => {
        if (!abgebrochen) setFehler('Das PDF konnte nicht erstellt werden.')
      })
    return () => {
      abgebrochen = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rechnung.id])

  const kannTeilen = pdf !== null && kannDateiTeilen(pdf)

  async function teilen() {
    if (!pdf) return
    const geklappt = await dateiTeilen(pdf, `Rechnung ${rechnung.number}`)
    if (!geklappt) setFehler('Teilen hat nicht geklappt.')
  }

  function herunterladen() {
    if (pdf) dateiHerunterladen(pdf)
  }

  function oeffnen() {
    if (!pdf) return
    const url = URL.createObjectURL(pdf)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <section className="seite">
      <button type="button" className="zurueck" onClick={onZurueck}>
        ← Alle Rechnungen
      </button>

      <div className="rechnung-werkzeuge">
        {kannTeilen ? (
          <button type="button" className="primary" onClick={teilen} disabled={!pdf}>
            PDF teilen
          </button>
        ) : (
          <button type="button" className="primary" onClick={herunterladen} disabled={!pdf}>
            PDF herunterladen
          </button>
        )}
        <button type="button" className="ghost" onClick={oeffnen} disabled={!pdf}>
          PDF öffnen
        </button>
        <button type="button" className="ghost" onClick={onStatusUmschalten}>
          {rechnung.status === 'offen' ? 'Als bezahlt markieren' : 'Wieder auf offen setzen'}
        </button>
      </div>

      {fehler && (
        <p className="error" role="alert">
          {fehler}
        </p>
      )}

      {pdf ? <PdfVorschau pdf={pdf} /> : !fehler && <p className="hinweis">PDF wird erstellt …</p>}
    </section>
  )
}
