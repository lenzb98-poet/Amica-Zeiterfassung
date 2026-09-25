import type { Rechnung } from './typen'
import type { Fahrt } from './steuer'
import { KM_PAUSCHALE } from './steuer'

const datum = (iso: string) => new Date(`${iso}T00:00:00Z`)

/** Alle Rechnungen eines Jahres als Excel-Datei, z. B. für die Steuerberatung. */
export async function erzeugeJahresliste(rechnungen: Rechnung[], jahr: number): Promise<File> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')

  const imJahr = rechnungen
    .filter((r) => r.invoice_date.startsWith(String(jahr)))
    .sort((a, b) => a.number_seq - b.number_seq)

  const kopf = [
    'Rechnungsnummer',
    'Rechnungsdatum',
    'Leistung von',
    'Leistung bis',
    'Empfänger',
    'Stunden',
    'Betrag',
    'Status',
    'Bezahlt am',
  ].map((value) => ({ value, fontWeight: 'bold' as const, backgroundColor: '#E7EFEE' }))

  const zeilen = imJahr.map((r) => {
    const minuten = r.items.reduce((summe, pos) => summe + pos.minutes, 0)
    return [
      { value: r.number },
      { value: datum(r.invoice_date), type: Date, format: 'dd.mm.yyyy' },
      { value: datum(r.period_start), type: Date, format: 'dd.mm.yyyy' },
      { value: datum(r.period_end), type: Date, format: 'dd.mm.yyyy' },
      { value: r.recipient.name },
      { value: Math.round((minuten / 60) * 100) / 100, type: Number, format: '0.00' },
      { value: Number(r.total), type: Number, format: '#,##0.00 "€"' },
      { value: r.status === 'bezahlt' ? 'bezahlt' : 'offen' },
      r.paid_at ? { value: datum(r.paid_at), type: Date, format: 'dd.mm.yyyy' } : null,
    ]
  })

  const summeStunden = imJahr.reduce(
    (summe, r) => summe + r.items.reduce((s, pos) => s + pos.minutes, 0),
    0,
  )
  const summeBetrag = imJahr.reduce((summe, r) => summe + Number(r.total), 0)
  const summe = [
    { value: 'Summe', fontWeight: 'bold' as const },
    null,
    null,
    null,
    { value: `${imJahr.length} Rechnungen` },
    { value: Math.round((summeStunden / 60) * 100) / 100, type: Number, format: '0.00', fontWeight: 'bold' as const },
    { value: Math.round(summeBetrag * 100) / 100, type: Number, format: '#,##0.00 "€"', fontWeight: 'bold' as const },
    null,
    null,
  ]

  const blob = await writeXlsxFile([kopf, ...zeilen, [], summe], {
    sheet: `Rechnungen ${jahr}`,
    columns: [
      { width: 16 },
      { width: 15 },
      { width: 13 },
      { width: 13 },
      { width: 26 },
      { width: 10 },
      { width: 13 },
      { width: 10 },
      { width: 13 },
    ],
    stickyRowsCount: 1,
  }).toBlob()

  return new File([blob], `Rechnungen_${jahr}_Amica.xlsx`, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/** Fahrtenliste als Nachweis der betrieblichen Fahrten für das Finanzamt. */
export async function erzeugeFahrtenliste(fahrten: Fahrt[], jahr: number): Promise<File> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')

  const kopf = ['Datum', 'Klient', 'Adresse', 'Zweck', 'Kilometer (hin und zurück)', 'Absetzbar'].map(
    (value) => ({ value, fontWeight: 'bold' as const, backgroundColor: '#E7EFEE' }),
  )
  const zeilen = fahrten.map((f) => [
    { value: datum(f.datum), type: Date, format: 'dd.mm.yyyy' },
    { value: f.klient },
    { value: f.adresse },
    { value: f.zweck },
    { value: f.km, type: Number, format: '0.0' },
    { value: f.betrag, type: Number, format: '#,##0.00 "€"' },
  ])
  const summeKm = Math.round(fahrten.reduce((s, f) => s + f.km, 0) * 10) / 10
  const summeBetrag = Math.round(fahrten.reduce((s, f) => s + f.betrag, 0) * 100) / 100
  const summe = [
    { value: 'Summe', fontWeight: 'bold' as const },
    { value: `${fahrten.length} Fahrten` },
    null,
    { value: `${KM_PAUSCHALE.toFixed(2).replace('.', ',')} € je km` },
    { value: summeKm, type: Number, format: '0.0', fontWeight: 'bold' as const },
    { value: summeBetrag, type: Number, format: '#,##0.00 "€"', fontWeight: 'bold' as const },
  ]

  const blob = await writeXlsxFile([kopf, ...zeilen, [], summe], {
    sheet: `Fahrten ${jahr}`,
    columns: [{ width: 12 }, { width: 22 }, { width: 32 }, { width: 20 }, { width: 14 }, { width: 12 }],
    stickyRowsCount: 1,
  }).toBlob()

  return new File([blob], `Fahrten_${jahr}_Amica.xlsx`, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
