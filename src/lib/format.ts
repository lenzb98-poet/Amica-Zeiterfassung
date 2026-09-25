import type { Monatsgruppe, Zeiteintrag } from './typen'

const monatsFormat = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })
const datumsFormat = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
})

/** Macht aus 95 Minuten "1 Std. 35 Min.". */
export function formatiereDauer(minuten: number): string {
  const stunden = Math.floor(minuten / 60)
  const rest = minuten % 60
  if (stunden === 0) return `${rest} Min.`
  if (rest === 0) return `${stunden} Std.`
  return `${stunden} Std. ${rest} Min.`
}

export function formatiereDatum(isoDatum: string): string {
  return datumsFormat.format(new Date(`${isoDatum}T00:00:00`))
}

/** Uhrzeit aus der Datenbank ("14:30:00") auf "14:30" kürzen. */
export function formatiereUhrzeit(zeit: string | null): string | null {
  return zeit ? zeit.slice(0, 5) : null
}

/** Minuten zwischen zwei Uhrzeiten; über Mitternacht wird mitgerechnet. */
export function berechneMinuten(start: string, ende: string): number {
  const [startStunde, startMinute] = start.split(':').map(Number)
  const [endeStunde, endeMinute] = ende.split(':').map(Number)
  const differenz = endeStunde * 60 + endeMinute - (startStunde * 60 + startMinute)
  return differenz < 0 ? differenz + 24 * 60 : differenz
}

/** Gruppiert Einträge nach Monat, neueste zuerst. */
export function gruppiereNachMonat(eintraege: Zeiteintrag[]): Monatsgruppe[] {
  const gruppen = new Map<string, Zeiteintrag[]>()

  for (const eintrag of eintraege) {
    const schluessel = eintrag.entry_date.slice(0, 7)
    const vorhandene = gruppen.get(schluessel)
    if (vorhandene) {
      vorhandene.push(eintrag)
    } else {
      gruppen.set(schluessel, [eintrag])
    }
  }

  return [...gruppen.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([schluessel, gruppenEintraege]) => ({
      schluessel,
      titel: monatsFormat.format(new Date(`${schluessel}-01T00:00:00`)),
      eintraege: [...gruppenEintraege].sort((a, b) => b.entry_date.localeCompare(a.entry_date)),
      minutenGesamt: gruppenEintraege.reduce((summe, e) => summe + e.minutes, 0),
    }))
}

/** Heutiges Datum als JJJJ-MM-TT in lokaler Zeit. */
export function heuteIso(): string {
  const jetzt = new Date()
  const monat = String(jetzt.getMonth() + 1).padStart(2, '0')
  const tag = String(jetzt.getDate()).padStart(2, '0')
  return `${jetzt.getFullYear()}-${monat}-${tag}`
}

const euroFormat = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

export function formatiereEuro(betrag: number): string {
  return euroFormat.format(betrag)
}

/** Liest "35", "35,5" oder "35.50" als Zahl; leer ergibt null, Ungültiges NaN. */
export function leseBetrag(eingabe: string): number | null {
  const bereinigt = eingabe.trim().replace(',', '.')
  if (!bereinigt) return null
  return /^\d+(\.\d{1,2})?$/.test(bereinigt) ? Number(bereinigt) : NaN
}

const langesDatum = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** "2026-08-07" → "07.08.2026" */
export function formatiereDatumLang(isoDatum: string): string {
  return langesDatum.format(new Date(`${isoDatum}T00:00:00`))
}

/** 105 Minuten → "1:45" */
export function formatiereStunden(minuten: number): string {
  return `${Math.floor(minuten / 60)}:${String(minuten % 60).padStart(2, '0')}`
}

/** Erster und letzter Tag eines Monats im Format JJJJ-MM-TT. */
export function monatsgrenzen(monat: string): { start: string; ende: string } {
  const [jahr, m] = monat.split('-').map(Number)
  const letzterTag = new Date(jahr, m, 0).getDate()
  return { start: `${monat}-01`, ende: `${monat}-${String(letzterTag).padStart(2, '0')}` }
}

/** Vormonat als JJJJ-MM – abgerechnet wird meist zu Beginn des Folgemonats. */
export function vormonat(): string {
  const heute = new Date()
  const d = new Date(heute.getFullYear(), heute.getMonth() - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monatsTitel(monat: string): string {
  return monatsFormat.format(new Date(`${monat}-01T00:00:00`))
}

/** Tage seit Ablauf des Zahlungsziels, 0 wenn noch nicht fällig. */
export function tageUeberfaellig(rechnungsdatum: string, zahlungszielTage: number, heute = heuteIso()): number {
  const faellig = new Date(`${rechnungsdatum}T00:00:00`)
  faellig.setDate(faellig.getDate() + zahlungszielTage)
  const tage = Math.round((new Date(`${heute}T00:00:00`).getTime() - faellig.getTime()) / 86_400_000)
  return Math.max(0, tage)
}

const kmFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })

/** 12.5 → "12,5 km" */
export function formatiereKm(km: number): string {
  return `${kmFormat.format(km)} km`
}

/** "2" → 120, "1,75" → 105, "1:45" → 105 Minuten; ungültig oder leer → null. */
export function leseStunden(eingabe: string): number | null {
  const text = eingabe.trim()
  const mitDoppelpunkt = /^(\d{1,2}):([0-5]\d)$/.exec(text)
  if (mitDoppelpunkt) return Number(mitDoppelpunkt[1]) * 60 + Number(mitDoppelpunkt[2])
  if (/^\d{1,2}([.,]\d{1,2})?$/.test(text)) {
    const minuten = Math.round(Number(text.replace(',', '.')) * 60)
    return minuten > 0 ? minuten : null
  }
  return null
}
