import type { Klient, Rechnung, Zeiteintrag } from './typen'

/** Pauschale für Fahrten mit dem privaten Auto, je gefahrenem Kilometer. */
export const KM_PAUSCHALE = 0.3

/** Umsatzgrenze der Kleinunternehmerregelung (§ 19 UStG) für ein Kalenderjahr. */
export const KLEINUNTERNEHMER_GRENZE = 25_000

export type Fahrt = {
  datum: string
  klient: string
  adresse: string
  zweck: string
  /** Hin- und Rückweg zusammen. */
  km: number
  betrag: number
}

const runde = (wert: number) => Math.round(wert * 100) / 100

/** Jeder Einsatz ist eine Fahrt von zu Hause zum Klienten und zurück. */
export function berechneFahrten(eintraege: Zeiteintrag[], klienten: Klient[]) {
  const nachId = new Map(klienten.map((k) => [k.id, k]))
  const fahrten: Fahrt[] = []
  const ohneEntfernung = new Set<string>()

  for (const eintrag of eintraege) {
    const klient = nachId.get(eintrag.client_id)
    if (!klient) continue
    if (klient.distance_km === null) {
      ohneEntfernung.add(klient.name)
      continue
    }
    const km = runde(Number(klient.distance_km) * 2)
    fahrten.push({
      datum: eintrag.entry_date,
      klient: klient.name,
      adresse: [klient.street, [klient.postal_code, klient.city].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(', '),
      zweck: klient.service_type,
      km,
      betrag: runde(km * KM_PAUSCHALE),
    })
  }

  fahrten.sort((a, b) => a.datum.localeCompare(b.datum))
  return {
    fahrten,
    km: runde(fahrten.reduce((summe, f) => summe + f.km, 0)),
    betrag: runde(fahrten.reduce((summe, f) => summe + f.betrag, 0)),
    ohneEntfernung: [...ohneEntfernung].sort(),
  }
}

/** Einnahmen zählen an dem Tag, an dem das Geld ankommt (Zahlungsdatum). */
export function einnahmenImJahr(rechnungen: Rechnung[], jahr: number) {
  const bezahlt = rechnungen.filter(
    (r) => r.status === 'bezahlt' && r.paid_at?.startsWith(String(jahr)),
  )
  const offen = rechnungen.filter(
    (r) => r.status === 'offen' && r.invoice_date.startsWith(String(jahr)),
  )
  return {
    betrag: runde(bezahlt.reduce((summe, r) => summe + Number(r.total), 0)),
    anzahl: bezahlt.length,
    offenBetrag: runde(offen.reduce((summe, r) => summe + Number(r.total), 0)),
    offenAnzahl: offen.length,
  }
}

/** Umsatz für die Kleinunternehmer-Grenze: alle Rechnungen mit Datum im Jahr. */
export function umsatzImJahr(rechnungen: Rechnung[], jahr: number): number {
  return runde(
    rechnungen
      .filter((r) => r.invoice_date.startsWith(String(jahr)))
      .reduce((summe, r) => summe + Number(r.total), 0),
  )
}
