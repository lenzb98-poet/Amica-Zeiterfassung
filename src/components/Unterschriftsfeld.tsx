import { useEffect, useRef, useState } from 'react'

type Props = {
  onSpeichern: (datenUrl: string) => void
  onAbbrechen: () => void
}

/**
 * Vollflächiges Fenster, in dem der Kunde mit dem Finger unterschreibt.
 * Zeichnet über Pointer Events, damit Finger, Stift und Maus gleich gut
 * funktionieren. Die Zeichenfläche wird für scharfe Linien an die
 * Pixeldichte des Geräts angepasst.
 */
export default function Unterschriftsfeld({ onSpeichern, onAbbrechen }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const zeichnetRef = useRef(false)
  const [istLeer, setIstLeer] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const skalieren = () => {
      const rechteck = canvas.getBoundingClientRect()
      const dichte = window.devicePixelRatio || 1
      canvas.width = rechteck.width * dichte
      canvas.height = rechteck.height * dichte

      const kontext = canvas.getContext('2d')
      if (!kontext) return
      kontext.scale(dichte, dichte)
      kontext.lineWidth = 2.5
      kontext.lineCap = 'round'
      kontext.lineJoin = 'round'
      kontext.strokeStyle = '#23302f'
    }

    skalieren()
    window.addEventListener('resize', skalieren)
    return () => window.removeEventListener('resize', skalieren)
  }, [])

  function positionIm(canvas: HTMLCanvasElement, event: React.PointerEvent) {
    const rechteck = canvas.getBoundingClientRect()
    return { x: event.clientX - rechteck.left, y: event.clientY - rechteck.top }
  }

  function beginneStrich(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const kontext = canvas?.getContext('2d')
    if (!canvas || !kontext) return

    canvas.setPointerCapture(event.pointerId)
    zeichnetRef.current = true
    const { x, y } = positionIm(canvas, event)
    kontext.beginPath()
    kontext.moveTo(x, y)
    setIstLeer(false)
  }

  function zeichneStrich(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!zeichnetRef.current) return
    const canvas = canvasRef.current
    const kontext = canvas?.getContext('2d')
    if (!canvas || !kontext) return

    const { x, y } = positionIm(canvas, event)
    kontext.lineTo(x, y)
    kontext.stroke()
  }

  function beendeStrich() {
    zeichnetRef.current = false
  }

  function leeren() {
    const canvas = canvasRef.current
    const kontext = canvas?.getContext('2d')
    if (!canvas || !kontext) return

    const dichte = window.devicePixelRatio || 1
    kontext.clearRect(0, 0, canvas.width / dichte, canvas.height / dichte)
    setIstLeer(true)
  }

  function speichern() {
    const canvas = canvasRef.current
    if (!canvas || istLeer) return
    onSpeichern(canvas.toDataURL('image/png'))
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Unterschrift">
      <div className="overlay-inhalt">
        <h2>Bitte hier unterschreiben</h2>
        <canvas
          ref={canvasRef}
          className="signatur-flaeche"
          onPointerDown={beginneStrich}
          onPointerMove={zeichneStrich}
          onPointerUp={beendeStrich}
          onPointerCancel={beendeStrich}
        />
        <div className="knopfreihe">
          <button type="button" className="ghost" onClick={onAbbrechen}>
            Abbrechen
          </button>
          <button type="button" className="ghost" onClick={leeren} disabled={istLeer}>
            Löschen
          </button>
          <button type="button" className="primary" onClick={speichern} disabled={istLeer}>
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  )
}
