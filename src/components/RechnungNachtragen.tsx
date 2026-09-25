import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { STANDARD_LEISTUNG, type Anrede, type Klient, type Rechnung } from '../lib/typen'
import { formatiereEuro, heuteIso, leseBetrag, leseStunden } from '../lib/format'
import { rechnungsnummer } from './Nummernkreis'

type Props = {
  klienten: Klient[]
  vergebeneNummern: number[]
  onZurueck: () => void
  onGespeichert: (rechnung: Rechnung) => void
}

type Posten = { schluessel: number; datum: string; stunden: string; preis: string; leistung: string }

let naechsterSchluessel = 1
const neuerPosten = (leistung: string, preis: string): Posten => ({
  schluessel: naechsterSchluessel++,
  datum: '',
  stunden: '',
  preis,
  leistung,
})

/** Eine Rechnung, die außerhalb der App geschrieben wurde, von Hand erfassen. */
export default function RechnungNachtragen({ klienten, vergebeneNummern, onZurueck, onGespeichert }: Props) {
  const [nummer, setNummer] = useState('')
  const [klientId, setKlientId] = useState('')
  const [anrede, setAnrede] = useState<Anrede | ''>('')
  const [name, setName] = useState('')
  const [strasse, setStrasse] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [datum, setDatum] = useState(heuteIso)
  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')
  const [posten, setPosten] = useState<Posten[]>(() => [neuerPosten(STANDARD_LEISTUNG, '')])
  const [bezahlt, setBezahlt] = useState(false)
  const [bezahltAm, setBezahltAm] = useState(heuteIso)
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  function klientWaehlen(id: string) {
    setKlientId(id)
    const klient = klienten.find((k) => k.id === id)
    if (!klient) return
    setAnrede(klient.salutation ?? '')
    setName(klient.name)
    setStrasse(klient.street ?? '')
    setPlz(klient.postal_code ?? '')
    setOrt(klient.city ?? '')
    const preis = klient.hourly_rate === null ? '' : klient.hourly_rate.toFixed(2).replace('.', ',')
    setPosten((liste) =>
      liste.map((p) => ({ ...p, leistung: klient.service_type, preis: p.preis || preis })),
    )
  }

  function postenAendern(schluessel: number, feld: keyof Omit<Posten, 'schluessel'>, wert: string) {
    setPosten((liste) => liste.map((p) => (p.schluessel === schluessel ? { ...p, [feld]: wert } : p)))
  }

  const nummerZahl = /^\d{1,6}$/.test(nummer.trim()) ? Number(nummer.trim()) : null
  const nummerVergeben = nummerZahl !== null && vergebeneNummern.includes(nummerZahl)

  const berechnet = posten.map((p) => {
    const minuten = leseStunden(p.stunden)
    const preis = leseBetrag(p.preis)
    const gueltig = Boolean(p.datum) && minuten !== null && preis !== null && !Number.isNaN(preis)
    return {
      ...p,
      minuten,
      preisZahl: preis,
      gueltig,
      betrag: gueltig ? Math.round(((minuten as number) / 60) * (preis as number) * 100) / 100 : 0,
    }
  })
  const summe = berechnet.reduce((s, p) => s + p.betrag, 0)

  const probleme = [
    nummerZahl === null && 'Nummer',
    nummerVergeben && 'Nummer ist schon vergeben',
    !name.trim() && 'Name',
    (!von || !bis) && 'Leistungszeitraum',
    von && bis && von > bis && 'Zeitraum: „von“ liegt nach „bis“',
    !berechnet.every((p) => p.gueltig) && 'Posten vollständig ausfüllen',
  ].filter(Boolean) as string[]

  async function speichern(event: FormEvent) {
    event.preventDefault()
    if (speichert || probleme.length > 0 || nummerZahl === null) return
    setSpeichert(true)
    setFehler(null)

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        number_seq: nummerZahl,
        number: rechnungsnummer(nummerZahl),
        client_id: klientId || null,
        invoice_date: datum,
        period_start: von,
        period_end: bis,
        recipient: {
          salutation: anrede || null,
          name: name.trim(),
          street: strasse.trim() || null,
          postal_code: plz.trim() || null,
          city: ort.trim() || null,
        },
        items: berechnet.map((p) => ({
          service: p.leistung.trim() || STANDARD_LEISTUNG,
          date: p.datum,
          minutes: p.minuten,
          rate: p.preisZahl,
          amount: p.betrag,
        })),
        total: Math.round(summe * 100) / 100,
        status: bezahlt ? 'bezahlt' : 'offen',
        paid_at: bezahlt ? bezahltAm : null,
      })
      .select()
      .single()

    setSpeichert(false)
    if (error || !data) {
      setFehler(
        error?.code === '23505'
          ? 'Diese Rechnungsnummer ist schon vergeben.'
          : 'Die Rechnung konnte nicht gespeichert werden.',
      )
      return
    }
    onGespeichert(data as Rechnung)
  }

  return (
    <section className="seite">
      <button type="button" className="zurueck" onClick={onZurueck}>
        ← Alle Rechnungen
      </button>

      <header>
        <h2>Rechnung nachtragen</h2>
        <p className="hinweis">
          Für Rechnungen, die du außerhalb der App geschrieben hast. Die Zeiterfassung bleibt davon
          unberührt.
        </p>
      </header>

      <form className="formular" onSubmit={speichern}>
        <div className="karte formular">
          <h3>Rechnung</h3>
          <div className="feldpaar">
            <label className="field">
              Nummer
              <div className="nummer-eingabe">
                <span>R-</span>
                <input
                  value={nummer}
                  onChange={(e) => setNummer(e.target.value)}
                  inputMode="numeric"
                  placeholder="0028"
                  aria-invalid={nummerVergeben}
                />
              </div>
            </label>
            <label className="field">
              Rechnungsdatum
              <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} required />
            </label>
          </div>
          {nummerVergeben && <span className="error">Diese Nummer ist schon vergeben.</span>}
          <div className="feldpaar">
            <label className="field">
              Leistung von
              <input type="date" value={von} onChange={(e) => setVon(e.target.value)} required />
            </label>
            <label className="field">
              bis
              <input type="date" value={bis} onChange={(e) => setBis(e.target.value)} required />
            </label>
          </div>
        </div>

        <div className="karte formular">
          <h3>Empfänger</h3>
          <label className="field">
            Klient übernehmen
            <select value={klientId} onChange={(e) => klientWaehlen(e.target.value)}>
              <option value="">– von Hand eintragen –</option>
              {klienten.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </label>
          <div className="feldpaar">
            <label className="field feld-plz">
              Anrede
              <select value={anrede} onChange={(e) => setAnrede(e.target.value as Anrede | '')}>
                <option value="">keine</option>
                <option value="Frau">Frau</option>
                <option value="Herr">Herr</option>
              </select>
            </label>
            <label className="field">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
          </div>
          <label className="field">
            Straße und Hausnummer
            <input value={strasse} onChange={(e) => setStrasse(e.target.value)} />
          </label>
          <div className="feldpaar">
            <label className="field feld-plz">
              PLZ
              <input value={plz} onChange={(e) => setPlz(e.target.value)} inputMode="numeric" />
            </label>
            <label className="field">
              Ort
              <input value={ort} onChange={(e) => setOrt(e.target.value)} />
            </label>
          </div>
        </div>

        <div className="karte formular">
          <h3>Posten</h3>
          {berechnet.map((p, i) => (
            <div key={p.schluessel} className="posten">
              <div className="posten-kopf">
                <span className="klient-name">Posten {i + 1}</span>
                {posten.length > 1 && (
                  <button
                    type="button"
                    className="ghost schmal loeschen"
                    onClick={() => setPosten((liste) => liste.filter((x) => x.schluessel !== p.schluessel))}
                  >
                    Entfernen
                  </button>
                )}
              </div>
              <label className="field">
                Leistung
                <input value={p.leistung} onChange={(e) => postenAendern(p.schluessel, 'leistung', e.target.value)} />
              </label>
              <div className="feldpaar posten-zahlen">
                <label className="field">
                  Datum
                  <input
                    type="date"
                    value={p.datum}
                    onChange={(e) => postenAendern(p.schluessel, 'datum', e.target.value)}
                  />
                </label>
                <label className="field">
                  Stunden
                  <input
                    value={p.stunden}
                    onChange={(e) => postenAendern(p.schluessel, 'stunden', e.target.value)}
                    inputMode="decimal"
                    placeholder="2:00"
                  />
                </label>
                <label className="field">
                  Preis / Std.
                  <input
                    value={p.preis}
                    onChange={(e) => postenAendern(p.schluessel, 'preis', e.target.value)}
                    inputMode="decimal"
                    placeholder="25,00"
                  />
                </label>
              </div>
              {p.gueltig && <span className="dauer-vorschau">{formatiereEuro(p.betrag)}</span>}
            </div>
          ))}
          <button
            type="button"
            className="ghost"
            onClick={() =>
              setPosten((liste) => [
                ...liste,
                neuerPosten(liste[liste.length - 1]?.leistung ?? STANDARD_LEISTUNG, liste[liste.length - 1]?.preis ?? ''),
              ])
            }
          >
            + Weiterer Posten
          </button>
          <div className="nachtrag-summe">
            <span>Rechnungsbetrag</span>
            <strong>{formatiereEuro(summe)}</strong>
          </div>
        </div>

        <div className="karte formular">
          <label className="schalter">
            <input type="checkbox" checked={bezahlt} onChange={(e) => setBezahlt(e.target.checked)} />
            Die Rechnung ist schon bezahlt
          </label>
          {bezahlt && (
            <label className="field">
              Bezahlt am
              <input type="date" value={bezahltAm} onChange={(e) => setBezahltAm(e.target.value)} />
            </label>
          )}
        </div>

        {fehler && (
          <p className="error" role="alert">
            {fehler}
          </p>
        )}
        {probleme.length > 0 && <p className="hinweis">Noch offen: {probleme.join(', ')}.</p>}

        <div className="knopfreihe formular-knoepfe">
          <button type="button" className="ghost" onClick={onZurueck}>
            Abbrechen
          </button>
          <button type="submit" className="primary" disabled={speichert || probleme.length > 0}>
            {speichert ? 'Speichern …' : 'Rechnung speichern'}
          </button>
        </div>
      </form>
    </section>
  )
}
