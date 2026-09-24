import { useEffect, useState } from 'react'
import type { Rechnung } from '../lib/typen'
import { erzeugeRechnungsPdf, pdfDateiname } from '../lib/rechnungPdf'
import PdfVorschau from './PdfVorschau'

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

  const kannTeilen =
    pdf !== null && typeof navigator.canShare === 'function' && navigator.canShare({ files: [pdf] })

  async function teilen() {
    if (!pdf) return
    try {
      await navigator.share({ files: [pdf], title: `Rechnung ${rechnung.number}` })
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') setFehler('Teilen hat nicht geklappt.')
    }
  }

  function herunterladen() {
    if (!pdf) return
    const url = URL.createObjectURL(pdf)
    const link = document.createElement('a')
    link.href = url
    link.download = pdf.name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
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
