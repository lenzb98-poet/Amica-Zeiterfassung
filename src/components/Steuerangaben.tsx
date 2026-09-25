import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Steuerprofil } from '../lib/steuer'
import { leseBetrag } from '../lib/format'

type Props = {
  profil: Steuerprofil
  onGespeichert: (profil: Steuerprofil) => void
  onAbbrechen: () => void
}

const alsText = (wert: number) => (wert ? String(wert).replace('.', ',') : '')

export default function Steuerangaben({ profil, onGespeichert, onAbbrechen }: Props) {
  const [verheiratet, setVerheiratet] = useState(profil.married)
  const [kirche, setKirche] = useState(profil.church_rate)
  const [andere, setAndere] = useState(alsText(profil.other_income))
  const [partner, setPartner] = useState(alsText(profil.partner_income))
  const [abzuege, setAbzuege] = useState(alsText(profil.deductions))
  const [ausgaben, setAusgaben] = useState(alsText(profil.other_expenses))
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  // Tausenderpunkte erlauben ("12.000"), Dezimalpunkte ("1200.50") aber nicht verschlucken.
  const zahlen = [andere, partner, abzuege, ausgaben].map((t) =>
    leseBetrag(t.replace(/\.(?=\d{3}(?!\d))/g, '')),
  )
  const ungueltig = zahlen.some((z) => Number.isNaN(z))

  async function speichern(event: FormEvent) {
    event.preventDefault()
    if (ungueltig || speichert) return
    setSpeichert(true)
    setFehler(null)
    const neu: Steuerprofil = {
      married: verheiratet,
      church_rate: kirche,
      other_income: zahlen[0] ?? 0,
      partner_income: verheiratet ? (zahlen[1] ?? 0) : 0,
      deductions: zahlen[2] ?? 0,
      other_expenses: zahlen[3] ?? 0,
    }
    const { error } = await supabase
      .from('tax_profile')
      .update({ ...neu, updated_at: new Date().toISOString() })
      .eq('id', true)
    setSpeichert(false)
    if (error) {
      setFehler('Die Angaben konnten nicht gespeichert werden.')
      return
    }
    onGespeichert(neu)
  }

  return (
    <form className="formular steuerangaben" onSubmit={speichern}>
      <div className="feldpaar">
        <label className="field">
          Familienstand
          <select
            value={verheiratet ? 'ja' : 'nein'}
            onChange={(e) => setVerheiratet(e.target.value === 'ja')}
          >
            <option value="nein">ledig / allein</option>
            <option value="ja">verheiratet, gemeinsame Erklärung</option>
          </select>
        </label>
        <label className="field">
          Kirchensteuer
          <select value={kirche} onChange={(e) => setKirche(Number(e.target.value))}>
            <option value={0}>keine</option>
            <option value={9}>ja (9 %)</option>
            <option value={8}>ja, Bayern oder Baden-Württemberg (8 %)</option>
          </select>
        </label>
      </div>

      <label className="field">
        Andere Einkünfte im Jahr
        <input value={andere} onChange={(e) => setAndere(e.target.value)} inputMode="decimal" placeholder="0" />
        <span className="feld-hinweis">Zum Beispiel ein Gehalt oder eine Rente, grob geschätzt.</span>
      </label>

      {verheiratet && (
        <label className="field">
          Einkünfte deines Partners im Jahr
          <input value={partner} onChange={(e) => setPartner(e.target.value)} inputMode="decimal" placeholder="0" />
        </label>
      )}

      <label className="field">
        Versicherung und Vorsorge im Jahr
        <input value={abzuege} onChange={(e) => setAbzuege(e.target.value)} inputMode="decimal" placeholder="0" />
        <span className="feld-hinweis">
          Kranken- und Pflegeversicherung, Rente – diese Beiträge senken die Steuer.
        </span>
      </label>

      <label className="field">
        Weitere Ausgaben fürs Geschäft im Jahr
        <input value={ausgaben} onChange={(e) => setAusgaben(e.target.value)} inputMode="decimal" placeholder="0" />
        <span className="feld-hinweis">Neben den Fahrten, zum Beispiel Handy, Material, Versicherung.</span>
      </label>

      {ungueltig && <span className="error">Bitte nur Beträge wie 1200 oder 1200,50 eintragen.</span>}
      {fehler && <span className="error">{fehler}</span>}

      <div className="knopfreihe formular-knoepfe">
        <button type="button" className="ghost" onClick={onAbbrechen}>
          Abbrechen
        </button>
        <button type="submit" className="primary" disabled={ungueltig || speichert}>
          {speichert ? 'Speichern …' : 'Angaben speichern'}
        </button>
      </div>
    </form>
  )
}
