import { useEffect, useRef, useState } from 'react'

let pdfjsGeladen: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> | null = null

function ladePdfjs() {
  pdfjsGeladen ??= Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker'),
  ]).then(([pdfjs, { default: PdfWorker }]) => {
    // Als gebündelter Worker (.js), damit der Webserver den richtigen Typ liefert.
    pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker()
    return pdfjs
  })
  return pdfjsGeladen
}

/**
 * Zeigt ein PDF Seite für Seite als Bild. So sieht man am Bildschirm genau
 * die Datei, die auch geteilt oder gedruckt wird.
 */
export default function PdfVorschau({ pdf }: { pdf: Blob }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fehler, setFehler] = useState(false)
  const [laedt, setLaedt] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let abgebrochen = false
    setLaedt(true)

    async function zeichnen() {
      const pdfjs = await ladePdfjs()

      const dokument = await pdfjs.getDocument({ data: await pdf.arrayBuffer() }).promise
      const breite = container!.clientWidth
      const dichte = window.devicePixelRatio || 1
      const leinwaende: HTMLCanvasElement[] = []

      for (let nummer = 1; nummer <= dokument.numPages; nummer++) {
        const seite = await dokument.getPage(nummer)
        const massstab = breite / seite.getViewport({ scale: 1 }).width
        const ansicht = seite.getViewport({ scale: massstab * dichte })
        const leinwand = document.createElement('canvas')
        leinwand.width = ansicht.width
        leinwand.height = ansicht.height
        leinwand.className = 'pdf-seite'
        leinwand.setAttribute('aria-label', `Seite ${nummer} von ${dokument.numPages}`)
        await seite.render({ canvasContext: leinwand.getContext('2d')!, viewport: ansicht }).promise
        leinwaende.push(leinwand)
      }

      if (!abgebrochen) {
        container!.replaceChildren(...leinwaende)
        setLaedt(false)
      }
      dokument.destroy()
    }

    zeichnen().catch(() => {
      if (!abgebrochen) setFehler(true)
    })
    return () => {
      abgebrochen = true
    }
  }, [pdf])

  return (
    <>
      {fehler && <p className="error">Die Vorschau konnte nicht angezeigt werden.</p>}
      {laedt && !fehler && <p className="hinweis">Vorschau wird erstellt …</p>}
      {/* Wird direkt befüllt, daher ohne React-Kinder. */}
      <div className="pdf-vorschau" ref={containerRef} />
    </>
  )
}
