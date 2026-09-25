import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Klient, Rechnung, Zeiteintrag } from '../lib/typen'
import { formatiereEuro, formatiereKm } from '../lib/format'
import {
  KLEINUNTERNEHMER_GRENZE,
  KM_PAUSCHALE,
  LEERES_PROFIL,
  berechneFahrten,
  einnahmenImJahr,
  schaetzeSteuern,
  tarifJahr,
  umsatzImJahr,
  type Steuerprofil,
} from '../lib/steuer'
import { erzeugeFahrtenliste, erzeugeJahresliste } from '../lib/excelExport'
import ExportKnopf from './ExportKnopf'
import Steuerangaben from './Steuerangaben'

const DIESES_JAHR = new Date().getFullYear()

export default function Steuern() {
  const [jahr, setJahr] = useState(DIESES_JAHR)
  const [klienten, setKlienten] = useState<Klient[]>([])
  const [rechnungen, setRechnungen] = useState<Rechnung[]>([])
  const [eintraege, setEintraege] = useState<Zeiteintrag[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [profil, setProfil] = useState<Steuerprofil>(LEERES_PROFIL)
  const [angabenOffen, setAngabenOffen] = useState(false)

  useEffect(() => {
    supabase
      .from('tax_profile')
      .select('*')
      .single()
      .then(({ data }) => {
        if (!data) return
        setProfil({
          married: data.married,
          church_rate: Number(data.church_rate),
          other_income: Number(data.other_income),
          partner_income: Number(data.partner_income),
          deductions: Number(data.deductions),
          other_expenses: Number(data.other_expenses),
        })
      })
  }, [])

  useEffect(() => {
    let abgebrochen = false
    setLaedt(true)
    Promise.all([
      supabase.from('clients').select('*'),
      supabase.from('invoices').select('*'),
      supabase
        .from('time_entries')
        .select('id, client_id, entry_date')
        .gte('entry_date', `${jahr}-01-01`)
        .lte('entry_date', `${jahr}-12-31`),
    ]).then(([k, r, z]) => {
      if (abgebrochen) return
      if (k.error || r.error || z.error) {
        setFehler('Die Daten konnten nicht geladen werden.')
      } else {
        setKlienten(k.data ?? [])
        setRechnungen(r.data ?? [])
        setEintraege((z.data ?? []) as Zeiteintrag[])
        setFehler(null)
      }
      setLaedt(false)
    })
    return () => {
      abgebrochen = true
    }
  }, [jahr])

  const jahre = useMemo(() => {
    const menge = new Set([DIESES_JAHR, ...rechnungen.map((r) => Number(r.invoice_date.slice(0, 4)))])
    return [...menge].sort((a, b) => b - a)
  }, [rechnungen])

  const einnahmen = einnahmenImJahr(rechnungen, jahr)
  const fahrten = useMemo(() => berechneFahrten(eintraege, klienten), [eintraege, klienten])
  const umsatz = umsatzImJahr(rechnungen, jahr)
  const anteil = Math.min(1, umsatz / KLEINUNTERNEHMER_GRENZE)
  const grenzeStufe = umsatz > KLEINUNTERNEHMER_GRENZE ? 'drueber' : anteil >= 0.8 ? 'knapp' : 'gut'
  const rechnungenImJahr = rechnungen.filter((r) => r.invoice_date.startsWith(String(jahr))).length
  const schaetzung = schaetzeSteuern(einnahmen.betrag, fahrten.betrag, profil, jahr)
  const angabenLeer = Object.values(profil).every((wert) => !wert)

  return (
    <section className="seite">
      <header className="seiten-kopf">
        <h2>Steuern</h2>
        <select
          className="jahr-auswahl"
          value={jahr}
          onChange={(e) => setJahr(Number(e.target.value))}
          aria-label="Jahr"
        >
          {jahre.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
      </header>

      {fehler && (
        <p className="error" role="alert">
          {fehler}
        </p>
      )}

      <div className={`steuer-kacheln${laedt ? ' laedt' : ''}`}>
        <article className="karte kachel">
          <span className="kachel-titel">Einnahmen</span>
          <span className="kachel-zahl">{formatiereEuro(einnahmen.betrag)}</span>
          <p className="hinweis">
            Bezahlte Rechnungen in {jahr}. Fürs Finanzamt zählt der Tag, an dem das Geld ankommt.
          </p>
          {einnahmen.offenAnzahl > 0 && (
            <p className="kachel-zusatz">
              Noch offen: {formatiereEuro(einnahmen.offenBetrag)} ({einnahmen.offenAnzahl}{' '}
              {einnahmen.offenAnzahl === 1 ? 'Rechnung' : 'Rechnungen'})
            </p>
          )}
        </article>

        <article className="karte kachel">
          <span className="kachel-titel">Steuerabgaben (geschätzt)</span>
          <span className="kachel-zahl">≈ {formatiereEuro(schaetzung.durchAmica.summe)}</span>
          <p className="hinweis">
            So viel Steuern kommen durch Amica bisher in {jahr} ungefähr dazu. Lege dafür etwa{' '}
            <strong>{formatiereEuro(schaetzung.durchAmica.summe / 12)} im Monat</strong> zurück.
          </p>
          <dl className="steuer-rechnung">
            <dt>Einnahmen</dt>
            <dd>{formatiereEuro(einnahmen.betrag)}</dd>
            <dt>− Fahrtkosten</dt>
            <dd>{formatiereEuro(fahrten.betrag)}</dd>
            {profil.other_expenses > 0 && (
              <>
                <dt>− weitere Ausgaben</dt>
                <dd>{formatiereEuro(profil.other_expenses)}</dd>
              </>
            )}
            <dt className="summe">= Gewinn</dt>
            <dd className="summe">{formatiereEuro(schaetzung.gewinn)}</dd>
            <dt>Einkommensteuer</dt>
            <dd>{formatiereEuro(schaetzung.durchAmica.einkommensteuer)}</dd>
            {schaetzung.durchAmica.soli > 0 && (
              <>
                <dt>Solidaritätszuschlag</dt>
                <dd>{formatiereEuro(schaetzung.durchAmica.soli)}</dd>
              </>
            )}
            {profil.church_rate > 0 && (
              <>
                <dt>Kirchensteuer</dt>
                <dd>{formatiereEuro(schaetzung.durchAmica.kirche)}</dd>
              </>
            )}
          </dl>
          {angabenLeer && (
            <p className="kachel-zusatz warnung">
              Noch ohne deine Angaben gerechnet – als ob Amica dein einziges Einkommen wäre.
            </p>
          )}
          {angabenOffen ? (
            <Steuerangaben
              profil={profil}
              onAbbrechen={() => setAngabenOffen(false)}
              onGespeichert={(neu) => {
                setProfil(neu)
                setAngabenOffen(false)
              }}
            />
          ) : (
            <button type="button" className="ghost schmal" onClick={() => setAngabenOffen(true)}>
              {angabenLeer ? 'Meine Angaben eintragen' : 'Meine Angaben ändern'}
            </button>
          )}
          <p className="feld-hinweis">
            Berechnet mit dem Einkommensteuertarif {tarifJahr(jahr)}, ohne Kinderfreibeträge und
            Sonderfälle. Gewerbesteuer fällt bei diesem Gewinn in der Regel nicht an.
          </p>
        </article>

        <article className="karte kachel">
          <span className="kachel-titel">Steuerersparnis durch Fahrten</span>
          <span className="kachel-zahl">≈ {formatiereEuro(schaetzung.ersparnisFahrten)}</span>
          <p className="hinweis">
            {fahrten.fahrten.length} Fahrten mit {formatiereKm(fahrten.km)} (hin und zurück) ergeben{' '}
            {formatiereEuro(fahrten.betrag)} Fahrtkosten zu je{' '}
            {KM_PAUSCHALE.toFixed(2).replace('.', ',')} € pro km. Die ziehst du vom Gewinn ab – dadurch
            zahlst du ungefähr so viel weniger Steuern.
          </p>
          {fahrten.betrag > 0 && schaetzung.ersparnisFahrten === 0 && (
            <p className="kachel-zusatz">
              Dein Einkommen liegt bisher unter dem steuerfreien Grundbetrag, deshalb sparst du im
              Moment noch nichts. Das ändert sich, sobald mehr Einkommen dazukommt.
            </p>
          )}
          {fahrten.proKlient.length > 0 && (
            <ul className="fahrten-liste">
              {fahrten.proKlient.map((k) => (
                <li key={k.klient}>
                  <span>{k.klient}</span>
                  <span className="hinweis">
                    {k.anzahl} × hin und zurück · {formatiereKm(k.km)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {fahrten.ohneEntfernung.length > 0 && (
            <p className="kachel-zusatz warnung">
              Entfernung fehlt bei: {fahrten.ohneEntfernung.join(', ')}. Diese Fahrten zählen noch
              nicht mit.
            </p>
          )}
        </article>

        <article className="karte kachel">
          <span className="kachel-titel">Kleinunternehmer-Grenze</span>
          <span className="kachel-zahl">
            {formatiereEuro(umsatz)}
            <span className="kachel-von"> von {formatiereEuro(KLEINUNTERNEHMER_GRENZE)}</span>
          </span>
          <div
            className={`grenze-balken ${grenzeStufe}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={KLEINUNTERNEHMER_GRENZE}
            aria-valuenow={umsatz}
          >
            <span style={{ width: `${anteil * 100}%` }} />
          </div>
          <p className="hinweis">
            {grenzeStufe === 'drueber'
              ? 'Die Grenze ist überschritten. Bitte sprich mit deiner Steuerberatung, denn ab nächstem Jahr gilt die Kleinunternehmerregelung dann nicht mehr.'
              : grenzeStufe === 'knapp'
                ? 'Die Grenze rückt näher. Sprich am besten rechtzeitig mit deiner Steuerberatung.'
                : 'Alles im grünen Bereich. Unter dieser Grenze musst du keine Umsatzsteuer berechnen.'}
          </p>
        </article>
      </div>

      <h3 className="abschnitt-titel">Unterlagen für die Steuer</h3>
      <div className="karte formular">
        <ExportKnopf
          titel={`Rechnungsliste ${jahr}`}
          beschreibung={`Alle ${rechnungenImJahr} Rechnungen mit Beträgen und Zahlungsstand.`}
          schluessel={`rechnungen-${jahr}-${rechnungenImJahr}`}
          erzeugen={() => erzeugeJahresliste(rechnungen, jahr)}
          deaktiviert={rechnungenImJahr === 0}
        />
        <ExportKnopf
          titel={`Fahrtenliste ${jahr}`}
          beschreibung="Jede Fahrt mit Datum, Klient, Adresse und Kilometern – als Nachweis."
          schluessel={`fahrten-${jahr}-${fahrten.fahrten.length}`}
          erzeugen={() => erzeugeFahrtenliste(fahrten.fahrten, jahr)}
          deaktiviert={fahrten.fahrten.length === 0}
        />
      </div>

      <p className="hinweis kleingedruckt">
        Diese Übersicht hilft beim Sortieren, ersetzt aber keine Steuerberatung.
      </p>
    </section>
  )
}
