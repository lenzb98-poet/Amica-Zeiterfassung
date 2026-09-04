export type Klient = {
  id: string
  name: string
  info: string | null
  photo_path: string | null
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
