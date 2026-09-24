import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Props = {
  /** Höchste bereits vergebene Nummer, z. B. 29 für R-0029. */
  letzteNummer: number | null
  /** Ändert sich nach jeder neuen Rechnung, damit die Anzeige nachlädt. */
  aktualisierung: number
}

export function rechnungsnummer(nummer: number): string {
  return `R-${String(nummer).padStart(4, '0')}`
}

export default function Nummernkreis({ letzteNummer, aktualisierung }: Props) {
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

  // Vergibt die Datenbank ohnehin eine höhere Nummer, wird diese angezeigt.
  const angezeigt =
    naechste === null ? null : Math.max(naechste, (letzteNummer ?? 0) + 1)
  const neueNummer = Number(eingabe)
  const eingabeGueltig = /^\d{1,6}$/.test(eingabe) && neueNummer > (letzteNummer ?? 0)

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
            {letzteNummer === null
              ? 'Mit dieser Nummer geht es weiter.'
              : `Muss höher sein als die zuletzt vergebene ${rechnungsnummer(letzteNummer)}.`}
          </p>
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
