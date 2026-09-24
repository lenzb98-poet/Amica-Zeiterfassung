export type Anrede = 'Frau' | 'Herr'

export const STANDARD_LEISTUNG = 'Hilfe im Haushalt'

export type Klient = {
  id: string
  name: string
  info: string | null
  photo_path: string | null
  hourly_rate: number | null
  salutation: Anrede | null
  street: string | null
  postal_code: string | null
  city: string | null
  service_type: string
  created_at: string
}

export type Zeiteintrag = {
  id: string
  client_id: string
  entry_date: string
  start_time: string | null
  end_time: string | null
  minutes: number
  note: string | null
  signature: string | null
  invoice_id: string | null
  created_at: string
}

/** Ein Monat mit seinen Einträgen, absteigend sortiert. */
export type Monatsgruppe = {
  /** Sortierschlüssel, Format JJJJ-MM. */
  schluessel: string
  titel: string
  eintraege: Zeiteintrag[]
  minutenGesamt: number
}

export type Rechnungsposition = {
  service: string
  date: string
  minutes: number
  rate: number
  amount: number
}

export type Rechnung = {
  id: string
  number: string
  number_seq: number
  client_id: string | null
  invoice_date: string
  period_start: string
  period_end: string
  recipient: {
    salutation: Anrede | null
    name: string
    street: string | null
    postal_code: string | null
    city: string | null
  }
  items: Rechnungsposition[]
  total: number
  status: 'offen' | 'bezahlt'
  paid_at: string | null
  created_at: string
}
