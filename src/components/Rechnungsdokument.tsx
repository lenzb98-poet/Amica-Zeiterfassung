import { useLayoutEffect, useRef, useState } from 'react'
import '@fontsource/jost/400.css'
import '@fontsource/jost/500.css'
import '@fontsource/jost/600.css'
import '../rechnung.css'
import logo from '../assets/logo.png'
import unterschrift from '../assets/unterschrift.png'
import { FIRMA } from '../lib/firma'
import {
  formatiereDatumLang,
  formatiereEuro,
  formatiereStunden,
} from '../lib/format'
import type { Rechnung } from '../lib/typen'

const A4_BREITE_PX = 794

function anredeZeile(r: Rechnung['recipient']): string {
  const nachname = r.name.trim().split(/\s+/).pop() ?? r.name
  if (r.salutation === 'Frau') return `Sehr geehrte Frau ${nachname},`
  if (r.salutation === 'Herr') return `Sehr geehrter Herr ${nachname},`
  return `Guten Tag ${r.name},`
}

/**
 * Die Rechnung als A4-Blatt. Am Bildschirm wird sie auf die verfügbare
 * Breite verkleinert; beim Drucken erscheint nur das Blatt in Originalgröße.
 */
export default function Rechnungsdokument({ rechnung }: { rechnung: Rechnung }) {
  const rahmenRef = useRef<HTMLDivElement>(null)
  const blattRef = useRef<HTMLElement>(null)
  const [faktor, setFaktor] = useState(1)
  const [blattHoehe, setBlattHoehe] = useState(0)

  useLayoutEffect(() => {
    const rahmen = rahmenRef.current
    if (!rahmen) return
    const messen = () => {
      setFaktor(Math.min(1, rahmen.clientWidth / A4_BREITE_PX))
      setBlattHoehe(blattRef.current?.offsetHeight ?? 0)
    }
    messen()
    const beobachter = new ResizeObserver(messen)
    beobachter.observe(rahmen)
    if (blattRef.current) beobachter.observe(blattRef.current)
    return () => beobachter.disconnect()
  }, [])

  const r = rechnung.recipient

  return (
    <div className="rechnung-rahmen" ref={rahmenRef} style={{ height: blattHoehe * faktor }}>
      <article className="rechnung-blatt" ref={blattRef} style={{ transform: `scale(${faktor})` }}>
        <header className="rb-kopf">
          <div className="rb-absenderzeile">
            {FIRMA.name} · {FIRMA.strasse} · {FIRMA.ort}
          </div>
          <img className="rb-logo" src={logo} alt={FIRMA.name} />
        </header>

        <address className="rb-empfaenger">
          {r.salutation && (
            <>
              {r.salutation}
              <br />
            </>
          )}
          {r.name}
          {r.street && (
            <>
              <br />
              {r.street}
            </>
          )}
          {(r.postal_code || r.city) && (
            <>
              <br />
              {[r.postal_code, r.city].filter(Boolean).join(' ')}
            </>
          )}
        </address>

        <div className="rb-meta">
          <div>
            <b>Rechnung</b>
            <span>{rechnung.number}</span>
          </div>
          <div>
            <b>Leistungszeitraum</b>
            <span>
              {formatiereDatumLang(rechnung.period_start)} – {formatiereDatumLang(rechnung.period_end)}
            </span>
          </div>
          <div>
            <b>Datum</b>
            <span>{formatiereDatumLang(rechnung.invoice_date)}</span>
          </div>
        </div>

        <div className="rb-anschreiben">
          <p>{anredeZeile(r)}</p>
          <p>hiermit stelle ich Ihnen die folgenden Leistungen in Rechnung:</p>
        </div>

        <table className="rb-tabelle">
          <thead>
            <tr>
              <th>Leistung</th>
              <th>Datum</th>
              <th className="rb-zahl">Stunden</th>
              <th className="rb-zahl">Einzelpreis</th>
              <th className="rb-zahl">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {rechnung.items.map((pos, i) => (
              <tr key={i}>
                <td>{pos.service}</td>
                <td>{formatiereDatumLang(pos.date)}</td>
                <td className="rb-zahl">{formatiereStunden(pos.minutes)}</td>
                <td className="rb-zahl">{formatiereEuro(Number(pos.rate))}</td>
                <td className="rb-zahl">{formatiereEuro(Number(pos.amount))}</td>
              </tr>
            ))}
            <tr className="rb-summe">
              <td colSpan={4}>Rechnungsbetrag</td>
              <td className="rb-zahl">{formatiereEuro(Number(rechnung.total))}</td>
            </tr>
          </tbody>
        </table>
        <p className="rb-ust">
          Gemäß § 19 UStG wird aufgrund der Kleinunternehmerregelung keine Umsatzsteuer erhoben.
        </p>

        <p className="rb-zahlung">
          Bitte überweisen Sie den Rechnungsbetrag innerhalb der nächsten {FIRMA.zahlungszielTage}{' '}
          Tage auf folgendes Konto:
        </p>
        <dl className="rb-bank">
          <dt>Empfänger</dt>
          <dd>{FIRMA.bank.inhaber}</dd>
          <dt>IBAN</dt>
          <dd className="rb-iban">{FIRMA.bank.iban}</dd>
          <dt>Bank</dt>
          <dd>
            {FIRMA.bank.institut} · BIC {FIRMA.bank.bic}
          </dd>
          <dt>Verwendungszweck</dt>
          <dd>{rechnung.number}</dd>
        </dl>

        <div className="rb-gruss">
          Vielen Dank und liebe Grüße
          <br />
          <img className="rb-unterschrift" src={unterschrift} alt="" />
          <br />
          {FIRMA.inhaberin}
        </div>

        <footer className="rb-fuss">
          <div>
            <b>{FIRMA.name}</b>
            <br />
            Inhaberin: {FIRMA.inhaberin}
            <br />
            {FIRMA.strasse}, {FIRMA.ort}
            <br />
            Steuernummer: {FIRMA.steuernummer}
          </div>
          <div>
            <b>Kontakt</b>
            <br />
            Tel.: {FIRMA.telefon}
            <br />
            {FIRMA.email}
          </div>
          <div>
            <b>Web</b>
            <br />
            {FIRMA.web}
          </div>
        </footer>
      </article>
    </div>
  )
}
