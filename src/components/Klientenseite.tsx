import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Klient, Zeiteintrag } from '../lib/typen'
import {
  berechneMinuten,
  formatiereDatum,
  formatiereDauer,
  formatiereUhrzeit,
  gruppiereNachMonat,
  heuteIso,
} from '../lib/format'
import Klientenfoto from './Klientenfoto'
import Unterschriftsfeld from './Unterschriftsfeld'
import Aktionsmenue from './Aktionsmenue'

type Props = {
  klient: Klient
  onZurueck: () => void
}

export default function Klientenseite({ klient, onZurueck }: Props) {
  const [eintraege, setEintraege] = useState<Zeiteintrag[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)

  const [datum, setDatum] = useState(heuteIso)
  const [start, setStart] = useState('')
  const [ende, setEnde] = useState('')
  const [notiz, setNotiz] = useState('')
  const [unterschrift, setUnterschrift] = useState<string | null>(null)
  const [unterschriftOffen, setUnterschriftOffen] = useState(false)
  const [speichert, setSpeichert] = useState(false)

  useEffect(() => {
    ladeEintraege()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klient.id])

  async function ladeEintraege() {
    setLaedt(true)
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('client_id', klient.id)
      .order('entry_date', { ascending: false })

    if (error) {
      setFehler('Die Zeiten konnten nicht geladen werden.')
    } else {
      setEintraege(data ?? [])
      setFehler(null)
    }
    setLaedt(false)
  }

  const monate = useMemo(() => gruppiereNachMonat(eintraege), [eintraege])

  const dauerVorschau = start && ende ? berechneMinuten(start, ende) : null

  async function eintragSpeichern(event: FormEvent) {
    event.preventDefault()
    if (speichert || !start || !ende) return

    setSpeichert(true)
    setFehler(null)

    const { error } = await supabase.from('time_entries').insert({
      client_id: klient.id,
      entry_date: datum,
      start_time: start,
      end_time: ende,
      minutes: berechneMinuten(start, ende),
      note: notiz.trim() || null,
      signature: unterschrift,
    })

    if (error) {
      setFehler('Der Eintrag konnte nicht gespeichert werden.')
      setSpeichert(false)
      return
    }

    setStart('')
    setEnde('')
    setNotiz('')
    setUnterschrift(null)
    setDatum(heuteIso())
    setSpeichert(false)
    await ladeEintraege()
  }

  async function eintragLoeschen(eintrag: Zeiteintrag) {
    const sicher = window.confirm(
      `Eintrag vom ${formatiereDatum(eintrag.entry_date)} wirklich löschen?`,
    )
    if (!sicher) return

    const { error } = await supabase.from('time_entries').delete().eq('id', eintrag.id)
    if (error) {
      setFehler('Der Eintrag konnte nicht gelöscht werden.')
      return
    }
    await ladeEintraege()
  }

  return (
    <section className="seite">
      <button type="button" className="zurueck" onClick={onZurueck}>
        ← Alle Klienten
      </button>

      <header className="klient-kopf">
        <Klientenfoto pfad={klient.photo_path} name={klient.name} />
        <div>
          <h2>{klient.name}</h2>
          {klient.info && <p className="klient-info">{klient.info}</p>}
        </div>
      </header>

      {fehler && (
        <p className="error" role="alert">
          {fehler}
        </p>
      )}

      <form className="karte formular" onSubmit={eintragSpeichern}>
        <h3>Zeit eintragen</h3>

        <label className="field">
          Datum
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} required />
        </label>

        <div className="feldpaar">
          <label className="field">
            Von
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <label className="field">
            Bis
            <input type="time" value={ende} onChange={(e) => setEnde(e.target.value)} required />
          </label>
        </div>

        {dauerVorschau !== null && (
          <p className="dauer-vorschau">Dauer: {formatiereDauer(dauerVorschau)}</p>
        )}

        <label className="field">
          Information zum Einsatz
          <textarea
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            rows={3}
            placeholder="z. B. Einkauf, Begleitung zum Arzt, Hausarbeit"
          />
        </label>

        <div className="field">
          Unterschrift des Kunden
          <button
            type="button"
            className="unterschrift-feld"
            onClick={() => setUnterschriftOffen(true)}
          >
            {unterschrift ? (
              <img src={unterschrift} alt="Erfasste Unterschrift" />
            ) : (
              <span className="unterschrift-hinweis">Zum Unterschreiben tippen</span>
            )}
          </button>
          {unterschrift && (
            <button type="button" className="ghost schmal" onClick={() => setUnterschrift(null)}>
              Unterschrift entfernen
            </button>
          )}
        </div>

        <button type="submit" className="primary" disabled={speichert || !start || !ende}>
          {speichert ? 'Speichern …' : 'Eintrag speichern'}
        </button>
      </form>

      {laedt ? (
        <p className="hinweis">Zeiten werden geladen …</p>
      ) : monate.length === 0 ? (
        <p className="hinweis">Noch keine Zeiten für diesen Klienten erfasst.</p>
      ) : (
        monate.map((monat) => (
          <section key={monat.schluessel} className="monat">
            <header className="monat-kopf">
              <h3>{monat.titel}</h3>
              <span className="monat-summe">{formatiereDauer(monat.minutenGesamt)}</span>
            </header>

            <ul className="eintragsliste">
              {monat.eintraege.map((eintrag) => (
                <li key={eintrag.id} className="karte eintrag">
                  <div className="eintrag-kopf">
                    <span className="eintrag-datum">{formatiereDatum(eintrag.entry_date)}</span>
                    <span className="eintrag-kopf-rechts">
                      <span className="eintrag-dauer">{formatiereDauer(eintrag.minutes)}</span>
                      <Aktionsmenue
                        label={`Aktionen für Eintrag vom ${formatiereDatum(eintrag.entry_date)}`}
                        onLoeschen={() => eintragLoeschen(eintrag)}
                      />
                    </span>
                  </div>

                  {eintrag.start_time && eintrag.end_time && (
                    <p className="eintrag-zeit">
                      {formatiereUhrzeit(eintrag.start_time)} – {formatiereUhrzeit(eintrag.end_time)}
                    </p>
                  )}

                  {eintrag.note && <p className="eintrag-notiz">{eintrag.note}</p>}

                  {eintrag.signature && (
                    <img
                      className="eintrag-unterschrift"
                      src={eintrag.signature}
                      alt="Unterschrift des Kunden"
                    />
                  )}

                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {unterschriftOffen && (
        <Unterschriftsfeld
          onAbbrechen={() => setUnterschriftOffen(false)}
          onSpeichern={(datenUrl) => {
            setUnterschrift(datenUrl)
            setUnterschriftOffen(false)
          }}
        />
      )}
    </section>
  )
}
