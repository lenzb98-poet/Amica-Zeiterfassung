import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Klient } from '../lib/typen'
import Klientenfoto from './Klientenfoto'
import Aktionsmenue from './Aktionsmenue'

type Props = {
  onKlientOeffnen: (klient: Klient) => void
}

export default function Klientenliste({ onKlientOeffnen }: Props) {
  const [klienten, setKlienten] = useState<Klient[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [formularOffen, setFormularOffen] = useState(false)

  const [name, setName] = useState('')
  const [info, setInfo] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [speichert, setSpeichert] = useState(false)

  useEffect(() => {
    ladeKlienten()
  }, [])

  async function ladeKlienten() {
    setLaedt(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      setFehler('Die Klienten konnten nicht geladen werden.')
    } else {
      setKlienten(data ?? [])
      setFehler(null)
    }
    setLaedt(false)
  }

  function formularZuruecksetzen() {
    setName('')
    setInfo('')
    setFoto(null)
    setFormularOffen(false)
  }

  async function klientAnlegen(event: FormEvent) {
    event.preventDefault()
    if (speichert || !name.trim()) return

    setSpeichert(true)
    setFehler(null)

    let fotoPfad: string | null = null

    if (foto) {
      const endung = foto.name.split('.').pop()?.toLowerCase() || 'jpg'
      const pfad = `${crypto.randomUUID()}.${endung}`
      const { error: uploadFehler } = await supabase.storage
        .from('client-photos')
        .upload(pfad, foto, { contentType: foto.type })

      if (uploadFehler) {
        setFehler('Das Foto konnte nicht hochgeladen werden.')
        setSpeichert(false)
        return
      }
      fotoPfad = pfad
    }

    const { error } = await supabase.from('clients').insert({
      name: name.trim(),
      info: info.trim() || null,
      photo_path: fotoPfad,
    })

    if (error) {
      setFehler('Der Klient konnte nicht gespeichert werden.')
      setSpeichert(false)
      return
    }

    formularZuruecksetzen()
    setSpeichert(false)
    await ladeKlienten()
  }

  async function klientLoeschen(klient: Klient) {
    const sicher = window.confirm(
      `„${klient.name}“ wirklich löschen? Alle erfassten Zeiten dieses Klienten gehen dabei verloren.`,
    )
    if (!sicher) return

    const { error } = await supabase.from('clients').delete().eq('id', klient.id)

    if (error) {
      setFehler('Der Klient konnte nicht gelöscht werden.')
      return
    }

    if (klient.photo_path) {
      await supabase.storage.from('client-photos').remove([klient.photo_path])
    }
    await ladeKlienten()
  }

  return (
    <section className="seite">
      <header className="seiten-kopf">
        <h2>Klienten</h2>
        <button className="primary schmal" onClick={() => setFormularOffen((offen) => !offen)}>
          {formularOffen ? 'Abbrechen' : 'Neuer Klient'}
        </button>
      </header>

      {fehler && (
        <p className="error" role="alert">
          {fehler}
        </p>
      )}

      {formularOffen && (
        <form className="karte formular" onSubmit={klientAnlegen}>
          <label className="field">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vor- und Nachname"
              required
              autoFocus
            />
          </label>

          <label className="field">
            Wichtige Informationen
            <textarea
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              rows={4}
              placeholder="z. B. Adresse, Schlüssel, Besonderheiten, Ansprechpartner"
            />
          </label>

          <label className="field">
            Foto
            <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
          </label>

          <button type="submit" className="primary" disabled={speichert || !name.trim()}>
            {speichert ? 'Speichern …' : 'Klient anlegen'}
          </button>
        </form>
      )}

      {laedt ? (
        <p className="hinweis">Klienten werden geladen …</p>
      ) : klienten.length === 0 ? (
        <p className="hinweis">
          Noch keine Klienten angelegt. Über „Neuer Klient“ den ersten hinzufügen.
        </p>
      ) : (
        <ul className="klientenliste">
          {klienten.map((klient) => (
            <li key={klient.id} className="karte klient-karte">
              <button
                type="button"
                className="klient-knopf"
                onClick={() => onKlientOeffnen(klient)}
              >
                <Klientenfoto pfad={klient.photo_path} name={klient.name} />
                <span className="klient-text">
                  <span className="klient-name">{klient.name}</span>
                  {klient.info && <span className="klient-info">{klient.info}</span>}
                </span>
              </button>
              <Aktionsmenue
                label={`Aktionen für ${klient.name}`}
                onLoeschen={() => klientLoeschen(klient)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
