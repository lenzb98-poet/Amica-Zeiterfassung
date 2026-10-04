import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Props = {
  /** Alle bereits vergebenen Nummern, z. B. [29, 31, 32]. */
  vergebeneNummern: number[]
  /** Ändert sich nach jeder neuen Rechnung, damit die Anzeige nachlädt. */
  aktualisierung: number
}

export function rechnungsnummer(nummer: number): string {
  return `R-${String(nummer).padStart(4, '0')}`
}

/** Nummern zwischen der kleinsten und größten vergebenen, die noch frei sind. */
function freieLuecken(vergeben: Set<number>): number[] {
  if (vergeben.size === 0) return []
  const nummern = [...vergeben]
  const luecken: number[] = []
  for (let n = Math.min(...nummern); n < Math.max(...nummern); n++) {
    if (!vergeben.has(n)) luecken.push(n)
  }
  return luecken
}

export default function Nummernkreis({ vergebeneNummern, aktualisierung }: Props) {
  const [naechste, setNaechste] = useState<number | null>(null)
  const [bearbeiten, setBearbeiten] = useState(false)
  const [eingabe, setEingabe] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [speichert, setSpeichert] = useState(false)

  useEffect(() => {
    supabase
      .from('invoice_settings')
      .select('next_number')
      .single()
      .then(({ data, error }) => {
        if (error) setFehler('Die Rechnungsnummer konnte nicht geladen werden.')
        else setNaechste(data.next_number)
      })
  }, [aktualisierung])

  const vergeben = new Set(vergebeneNummern)
  const luecken = freieLuecken(vergeben)

  // Die Datenbank überspringt vergebene Nummern, diese wird dann angezeigt.
  let angezeigt = naechste
  while (angezeigt !== null && vergeben.has(angezeigt)) angezeigt += 1

  const neueNummer = Number(eingabe)
  const eingabeGueltig = /^\d{1,6}$/.test(eingabe) && neueNummer > 0 && !vergeben.has(neueNummer)

  async function speichern(event: FormEvent) {
    event.preventDefault()
    if (!eingabeGueltig || speichert) return
    setSpeichert(true)
    setFehler(null)

    const { error } = await supabase
      .from('invoice_settings')
      .update({ next_number: neueNummer })
      .eq('id', true)

    setSpeichert(false)
    if (error) {
      setFehler('Die Nummer konnte nicht gespeichert werden. Ist sie schon vergeben?')
      return
    }
    setNaechste(neueNummer)
    setBearbeiten(false)
  }

  return (
    <div className="karte formular">
      <div className="nummernkreis-kopf">
        <div>
          <h3>Rechnungsnummern</h3>
          <p className="hinweis">
            Nächste Rechnung:{' '}
            <strong className="nummer">{angezeigt === null ? '…' : rechnungsnummer(angezeigt)}</strong>
          </p>
        </div>
        {!bearbeiten && angezeigt !== null && (
          <button
            type="button"
            className="ghost schmal"
            onClick={() => {
              setEingabe(String(angezeigt))
              setBearbeiten(true)
            }}
          >
            Ändern
          </button>
        )}
      </div>

      {fehler && (
        <p className="error" role="alert">
          {fehler}
        </p>
      )}

      {bearbeiten && (
        <form className="formular" onSubmit={speichern}>
          <label className="field">
            Nächste Rechnungsnummer
            <div className="nummer-eingabe">
              <span>R-</span>
              <input
                value={eingabe}
                onChange={(e) => setEingabe(e.target.value.trim())}
                inputMode="numeric"
                autoFocus
                aria-invalid={eingabe !== '' && !eingabeGueltig}
              />
            </div>
          </label>
          <p className={eingabe !== '' && !eingabeGueltig ? 'error' : 'hinweis'}>
            {eingabe !== '' && vergeben.has(neueNummer)
              ? `${rechnungsnummer(neueNummer)} ist schon vergeben.`
              : 'Mit dieser Nummer geht es weiter. Danach folgt die nächste freie Nummer.'}
          </p>
          {luecken.length > 0 && (
            <div className="nummern-luecken">
              <span className="hinweis">Freie Nummern dazwischen:</span>
              {luecken.map((n) => (
                <button key={n} type="button" className="ghost schmal" onClick={() => setEingabe(String(n))}>
                  {rechnungsnummer(n)}
                </button>
              ))}
            </div>
          )}
          <div className="knopfreihe formular-knoepfe">
            <button type="button" className="ghost" onClick={() => setBearbeiten(false)}>
              Abbrechen
            </button>
            <button type="submit" className="primary" disabled={!eingabeGueltig || speichert}>
              {speichert ? 'Speichern …' : 'Speichern'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
