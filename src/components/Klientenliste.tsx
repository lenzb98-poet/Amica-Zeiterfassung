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
  const [bearbeiteterKlient, setBearbeiteterKlient] = useState<Klient | null>(null)

  const [name, setName] = useState('')
  const [info, setInfo] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoEntfernen, setFotoEntfernen] = useState(false)
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
    setFotoEntfernen(false)
    setFormularOffen(false)
    setBearbeiteterKlient(null)
  }

  function formularZumAnlegenOeffnen() {
    if (formularOffen && !bearbeiteterKlient) {
      formularZuruecksetzen()
      return
    }
    setBearbeiteterKlient(null)
    setName('')
    setInfo('')
    setFoto(null)
    setFotoEntfernen(false)
    setFormularOffen(true)
  }

  function formularZumBearbeitenOeffnen(klient: Klient) {
    setBearbeiteterKlient(klient)
    setName(klient.name)
    setInfo(klient.info ?? '')
    setFoto(null)
    setFotoEntfernen(false)
    setFormularOffen(true)
  }

  async function ladeFotoHoch(datei: File): Promise<string | null> {
    const endung = datei.name.split('.').pop()?.toLowerCase() || 'jpg'
    const pfad = `${crypto.randomUUID()}.${endung}`
    const { error: uploadFehler } = await supabase.storage
      .from('client-photos')
      .upload(pfad, datei, { contentType: datei.type })

    if (uploadFehler) return null
    return pfad
  }

  async function klientAnlegen(event: FormEvent) {
    event.preventDefault()
    if (speichert || !name.trim()) return

    setSpeichert(true)
    setFehler(null)

    let fotoPfad: string | null = null

    if (foto) {
      fotoPfad = await ladeFotoHoch(foto)
      if (!fotoPfad) {
        setFehler('Das Foto konnte nicht hochgeladen werden.')
        setSpeichert(false)
        return
      }
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

  async function klientAktualisieren(event: FormEvent) {
    event.preventDefault()
    if (speichert || !name.trim() || !bearbeiteterKlient) return

    setSpeichert(true)
    setFehler(null)

    let fotoPfad = bearbeiteterKlient.photo_path

    if (foto) {
      const neuerPfad = await ladeFotoHoch(foto)
      if (!neuerPfad) {
        setFehler('Das Foto konnte nicht hochgeladen werden.')
        setSpeichert(false)
        return
      }
      fotoPfad = neuerPfad
    } else if (fotoEntfernen) {
      fotoPfad = null
    }

    const { error } = await supabase
      .from('clients')
      .update({ name: name.trim(), info: info.trim() || null, photo_path: fotoPfad })
      .eq('id', bearbeiteterKlient.id)

    if (error) {
      setFehler('Der Klient konnte nicht gespeichert werden.')
      setSpeichert(false)
      return
    }

    const altesFotoLoeschen =
      bearbeiteterKlient.photo_path && bearbeiteterKlient.photo_path !== fotoPfad
    if (altesFotoLoeschen) {
      await supabase.storage.from('client-photos').remove([bearbeiteterKlient.photo_path!])
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
    if (bearbeiteterKlient?.id === klient.id) formularZuruecksetzen()
    await ladeKlienten()
  }

  return (
    <section className="seite">
      <header className="seiten-kopf">
        <h2>Klienten</h2>
        <button className="primary schmal" onClick={formularZumAnlegenOeffnen}>
          {formularOffen && !bearbeiteterKlient ? 'Abbrechen' : 'Neuer Klient'}
        </button>
      </header>

      {fehler && (
        <p className="error" role="alert">
          {fehler}
        </p>
      )}

      {formularOffen && (
        <form
          className="karte formular"
          onSubmit={bearbeiteterKlient ? klientAktualisieren : klientAnlegen}
        >
          <h3>{bearbeiteterKlient ? 'Klient bearbeiten' : 'Neuer Klient'}</h3>

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

          {bearbeiteterKlient?.photo_path && !fotoEntfernen && !foto && (
            <div className="feld-mit-aktion">
              <span className="hinweis">Aktuelles Foto bleibt, wenn kein neues gewählt wird.</span>
              <button
                type="button"
                className="ghost schmal"
                onClick={() => setFotoEntfernen(true)}
              >
                Foto entfernen
              </button>
            </div>
          )}

          <label className="field">
            {bearbeiteterKlient ? 'Neues Foto' : 'Foto'}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setFoto(e.target.files?.[0] ?? null)
                setFotoEntfernen(false)
              }}
            />
          </label>

          <div className="knopfreihe formular-knoepfe">
            <button type="button" className="ghost" onClick={formularZuruecksetzen}>
              Abbrechen
            </button>
            <button type="submit" className="primary" disabled={speichert || !name.trim()}>
              {speichert ? 'Speichern …' : bearbeiteterKlient ? 'Änderungen speichern' : 'Klient anlegen'}
            </button>
          </div>
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
                onBearbeiten={() => formularZumBearbeitenOeffnen(klient)}
                onLoeschen={() => klientLoeschen(klient)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
