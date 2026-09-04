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
