import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Klient, Rechnung, Zeiteintrag } from '../lib/typen'
import {
  formatiereDatumLang,
  formatiereDauer,
  formatiereEuro,
  monatsgrenzen,
  monatsTitel,
  tageUeberfaellig,
  vormonat,
} from '../lib/format'
import { useZurueckWisch } from '../lib/zurueckWisch'
import { FIRMA } from '../lib/firma'
import RechnungAnsicht from './RechnungAnsicht'
import Nummernkreis, { rechnungsnummer } from './Nummernkreis'
import Aktionsmenue from './Aktionsmenue'

type OffenerPosten = {
  klient: Klient
  minuten: number
  anzahl: number
  betrag: number | null
  fehlt: string[]
}

export default function Rechnungen() {
  const [monat, setMonat] = useState(vormonat)
  const [klienten, setKlienten] = useState<Klient[]>([])
  const [offeneZeiten, setOffeneZeiten] = useState<Zeiteintrag[]>([])
  const [rechnungen, setRechnungen] = useState<Rechnung[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [erstelltGerade, setErstelltGerade] = useState<string | null>(null)
  const [offeneRechnung, setOffeneRechnung] = useState<Rechnung | null>(null)

  const schliessen = useZurueckWisch(
    offeneRechnung !== null,
    () => setOffeneRechnung(null),
    'rechnung-ansicht',
  )

  const laden = useCallback(async () => {
    setLaedt(true)
    const { start, ende } = monatsgrenzen(monat)
    const [k, z, r] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase
        .from('time_entries')
        .select('*')
        .is('invoice_id', null)
        .gte('entry_date', start)
        .lte('entry_date', ende),
      supabase.from('invoices').select('*').order('number_seq', { ascending: false }),
    ])

    if (k.error || z.error || r.error) {
      setFehler('Die Daten konnten nicht geladen werden.')
    } else {
      setKlienten(k.data ?? [])
      setOffeneZeiten(z.data ?? [])
      setRechnungen(r.data ?? [])
      setFehler(null)
    }
    setLaedt(false)
  }, [monat])

  useEffect(() => {
    laden()
  }, [laden])

  const offenePosten = useMemo<OffenerPosten[]>(() => {
    return klienten
      .map((klient) => {
        const zeiten = offeneZeiten.filter((z) => z.client_id === klient.id)
        const minuten = zeiten.reduce((summe, z) => summe + z.minutes, 0)
        const satz = klient.hourly_rate === null ? null : Number(klient.hourly_rate)
        const fehlt: string[] = []
        if (satz === null) fehlt.push('Stundensatz')
        if (!klient.street || !klient.postal_code || !klient.city) fehlt.push('Anschrift')
        return {
          klient,
          minuten,
          anzahl: zeiten.length,
          betrag:
            satz === null
              ? null
              : zeiten.reduce((summe, z) => summe + Math.round((z.minutes / 60) * satz * 100) / 100, 0),
          fehlt,
        }
      })
      .filter((posten) => posten.anzahl > 0)
  }, [klienten, offeneZeiten])

  async function rechnungErstellen(klient: Klient) {
    if (erstelltGerade) return
    setErstelltGerade(klient.id)
    setFehler(null)

    const { start, ende } = monatsgrenzen(monat)
    const { data, error } = await supabase.rpc('create_invoice', {
      p_client_id: klient.id,
      p_period_start: start,
      p_period_end: ende,
    })

    setErstelltGerade(null)
    if (error || !data) {
      setFehler(`Die Rechnung für ${klient.name} konnte nicht erstellt werden.`)
      return
    }
    await laden()
    setOffeneRechnung(data as Rechnung)
  }

  async function rechnungLoeschen(rechnung: Rechnung) {
    const hoechste = Math.max(...rechnungen.map((r) => r.number_seq))
    const nummerHinweis =
      rechnung.number_seq === hoechste
        ? `Die Nummer ${rechnung.number} wird wieder frei.`
        : `Die Nummer ${rechnung.number} bleibt eine Lücke, weil danach schon ${rechnungsnummer(hoechste)} erstellt wurde.`
    const sicher = window.confirm(
      `Rechnung ${rechnung.number} an ${rechnung.recipient.name} wirklich löschen?\n\n` +
        `Die abgerechneten Zeiten werden wieder offen und können neu abgerechnet werden. ${nummerHinweis}`,
    )
    if (!sicher) return

    const { error } = await supabase.rpc('delete_invoice', { p_invoice_id: rechnung.id })
    if (error) {
      setFehler('Die Rechnung konnte nicht gelöscht werden.')
      return
    }
    await laden()
  }

  async function statusUmschalten(rechnung: Rechnung) {
    const bezahlt = rechnung.status === 'offen'
    const aenderung = {
      status: bezahlt ? 'bezahlt' : 'offen',
      paid_at: bezahlt ? new Date().toISOString().slice(0, 10) : null,
    } as const
    const { error } = await supabase.from('invoices').update(aenderung).eq('id', rechnung.id)
    if (error) {
      setFehler('Der Status konnte nicht geändert werden.')
      return
    }
    setRechnungen((liste) => liste.map((r) => (r.id === rechnung.id ? { ...r, ...aenderung } : r)))
    setOffeneRechnung((r) => (r && r.id === rechnung.id ? { ...r, ...aenderung } : r))
  }

  if (offeneRechnung) {
    return (
      <RechnungAnsicht
        rechnung={offeneRechnung}
        onZurueck={schliessen}
        onStatusUmschalten={() => statusUmschalten(offeneRechnung)}
      />
    )
  }


  return (
    <section className="seite">
      <header className="seiten-kopf">
        <h2>Rechnungen</h2>
      </header>

      {fehler && (
        <p className="error" role="alert">
          {fehler}
        </p>
      )}

      <div className="karte formular">
        <label className="field">
          Abrechnungsmonat
          <input type="month" value={monat} onChange={(e) => e.target.value && setMonat(e.target.value)} />
        </label>

        <h3>Offen für {monatsTitel(monat)}</h3>

        {laedt ? (
          <p className="hinweis">Wird geladen …</p>
        ) : offenePosten.length === 0 ? (
          <p className="hinweis">Keine offenen Zeiten in diesem Monat – alles abgerechnet.</p>
        ) : (
          <ul className="abrechnungsliste">
            {offenePosten.map((posten) => (
              <li key={posten.klient.id} className="abrechnung">
                <div className="abrechnung-text">
                  <span className="klient-name">{posten.klient.name}</span>
                  <span className="hinweis">
                    {posten.anzahl} {posten.anzahl === 1 ? 'Einsatz' : 'Einsätze'} ·{' '}
                    {formatiereDauer(posten.minuten)}
                    {posten.betrag !== null && ` · ${formatiereEuro(posten.betrag)}`}
                  </span>
                  {posten.fehlt.length > 0 && (
                    <span className="abrechnung-warnung">
                      Beim Klienten fehlt: {posten.fehlt.join(', ')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="primary schmal"
                  disabled={posten.fehlt.length > 0 || erstelltGerade !== null}
                  onClick={() => rechnungErstellen(posten.klient)}
                >
                  {erstelltGerade === posten.klient.id ? 'Erstellen …' : 'Rechnung erstellen'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h3 className="abschnitt-titel">Erstellte Rechnungen</h3>
      {!laedt && rechnungen.length === 0 ? (
        <p className="hinweis">Noch keine Rechnungen erstellt.</p>
      ) : (
        <ul className="klientenliste">
          {rechnungen.map((rechnung) => (
            <li key={rechnung.id} className="karte rechnung-karte">
              <button
                type="button"
                className="rechnung-knopf"
                onClick={() => setOffeneRechnung(rechnung)}
              >
                <span className="rechnung-zeile">
                  <span className="klient-name">{rechnung.number}</span>
                  <span className="klient-name">{formatiereEuro(Number(rechnung.total))}</span>
                </span>
                <span className="rechnung-zeile">
                  <span className="hinweis">
                    {rechnung.recipient.name} · {monatsTitel(rechnung.period_start.slice(0, 7))}
                  </span>
                  <StatusSchild rechnung={rechnung} />
                </span>
              </button>
              <Aktionsmenue
                label={`Aktionen für Rechnung ${rechnung.number}`}
                onLoeschen={() => rechnungLoeschen(rechnung)}
              />
            </li>
          ))}
        </ul>
      )}

      <Nummernkreis
        letzteNummer={rechnungen.length ? Math.max(...rechnungen.map((r) => r.number_seq)) : null}
        aktualisierung={rechnungen.length}
      />
    </section>
  )
}

function StatusSchild({ rechnung }: { rechnung: Rechnung }) {
  if (rechnung.status === 'bezahlt') {
    return (
      <span className="status status-bezahlt">
        bezahlt{rechnung.paid_at && ` am ${formatiereDatumLang(rechnung.paid_at)}`}
      </span>
    )
  }
  const tage = tageUeberfaellig(rechnung.invoice_date, FIRMA.zahlungszielTage)
  if (tage > 0) {
    return (
      <span className="status status-ueberfaellig">
        überfällig seit {tage} {tage === 1 ? 'Tag' : 'Tagen'}
      </span>
    )
  }
  return <span className="status status-offen">offen</span>
}
