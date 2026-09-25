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

  const proKlient = new Map<string, { klient: string; anzahl: number; km: number }>()
  for (const f of fahrten) {
    const eintrag = proKlient.get(f.klient) ?? { klient: f.klient, anzahl: 0, km: 0 }
    eintrag.anzahl += 1
    eintrag.km = runde(eintrag.km + f.km)
    proKlient.set(f.klient, eintrag)
  }

  return {
    proKlient: [...proKlient.values()].sort((a, b) => b.km - a.km),
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

/** Angaben, die die Einkommensteuer beeinflussen (alle Beträge pro Jahr). */
export type Steuerprofil = {
  married: boolean
  /** 0 = keine Kirchensteuer, 8 (Bayern, Baden-Württemberg) oder 9 (übrige Länder). */
  church_rate: number
  /** Andere zu versteuernde Einkünfte, z. B. Gehalt oder Rente. */
  other_income: number
  /** Zu versteuerndes Einkommen des Ehepartners (nur bei Zusammenveranlagung). */
  partner_income: number
  /** Abzüge wie Kranken-/Pflegeversicherung und Altersvorsorge. */
  deductions: number
  /** Weitere Betriebsausgaben neben den Fahrten, z. B. Handy, Material. */
  other_expenses: number
}

export const LEERES_PROFIL: Steuerprofil = {
  married: false,
  church_rate: 0,
  other_income: 0,
  partner_income: 0,
  deductions: 0,
  other_expenses: 0,
}

/** Einkommensteuer-Grundtarif nach § 32a EStG. */
export function einkommensteuer(zvE: number, jahr: number): number {
  const x = Math.floor(Math.max(0, zvE))
  if (jahr <= 2025) {
    if (x <= 12_096) return 0
    if (x <= 17_443) {
      const y = (x - 12_096) / 10_000
      return Math.floor((932.3 * y + 1_400) * y)
    }
    if (x <= 68_480) {
      const z = (x - 17_443) / 10_000
      return Math.floor((176.64 * z + 2_397) * z + 1_015.13)
    }
    if (x <= 277_825) return Math.floor(0.42 * x - 10_911.92)
    return Math.floor(0.45 * x - 19_246.67)
  }
  if (x <= 12_348) return 0
  if (x <= 17_799) {
    const y = (x - 12_348) / 10_000
    return Math.floor((914.51 * y + 1_400) * y)
  }
  if (x <= 69_878) {
    const z = (x - 17_799) / 10_000
    return Math.floor((173.1 * z + 2_397) * z + 1_034.87)
  }
  if (x <= 277_825) return Math.floor(0.42 * x - 11_135.63)
  return Math.floor(0.45 * x - 19_470.38)
}

/** Tarifjahr, das für die Berechnung verwendet wird. */
export const tarifJahr = (jahr: number) => (jahr <= 2025 ? 2025 : 2026)

function soli(est: number, verheiratet: boolean, jahr: number): number {
  const freigrenze = (tarifJahr(jahr) === 2025 ? 19_950 : 20_350) * (verheiratet ? 2 : 1)
  if (est <= freigrenze) return 0
  return runde(Math.min(0.055 * est, 0.119 * (est - freigrenze)))
}

export type Steuern = { einkommensteuer: number; soli: number; kirche: number; summe: number }

/** Steuern für ein zu versteuerndes Einkommen; bei Verheirateten mit Splitting. */
export function steuernFuer(zvE: number, profil: Steuerprofil, jahr: number): Steuern {
  const est = profil.married
    ? 2 * einkommensteuer(Math.max(0, zvE) / 2, jahr)
    : einkommensteuer(zvE, jahr)
  const s = soli(est, profil.married, jahr)
  const kirche = runde((est * profil.church_rate) / 100)
  return { einkommensteuer: est, soli: s, kirche, summe: runde(est + s + kirche) }
}

const minus = (a: Steuern, b: Steuern): Steuern => ({
  einkommensteuer: runde(a.einkommensteuer - b.einkommensteuer),
  soli: runde(a.soli - b.soli),
  kirche: runde(a.kirche - b.kirche),
  summe: runde(a.summe - b.summe),
})

/**
 * Schätzt, wie viel Steuern durch das Amica-Einkommen dazukommen und wie viel
 * die Fahrten davon einsparen. Vereinfacht: ohne Pauschbeträge, Kinder und
 * Sonderfälle – eine Orientierung zum Zurücklegen, keine Steuererklärung.
 */
export function schaetzeSteuern(
  einnahmen: number,
  fahrtkosten: number,
  profil: Steuerprofil,
  jahr: number,
) {
  const gewinn = runde(einnahmen - fahrtkosten - profil.other_expenses)
  const grundlage =
    profil.other_income + (profil.married ? profil.partner_income : 0) - profil.deductions

  const ohneAmica = steuernFuer(grundlage, profil, jahr)
  const mitAmica = steuernFuer(grundlage + gewinn, profil, jahr)
  const ohneFahrtabzug = steuernFuer(grundlage + gewinn + fahrtkosten, profil, jahr)

  return {
    gewinn,
    zvE: Math.max(0, runde(grundlage + gewinn)),
    durchAmica: minus(mitAmica, ohneAmica),
    ersparnisFahrten: runde(ohneFahrtabzug.summe - mitAmica.summe),
    gesamt: mitAmica,
  }
}
