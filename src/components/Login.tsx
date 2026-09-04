import { useState, type FormEvent } from 'react'
import { supabase, APP_USER_EMAIL } from '../lib/supabase'

export default function Login() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (loading) return

    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: APP_USER_EMAIL,
      password,
    })

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Das Passwort stimmt nicht. Bitte noch einmal versuchen.'
          : 'Anmeldung fehlgeschlagen. Bitte später erneut versuchen.',
      )
      setPassword('')
      setLoading(false)
      return
    }

    // Bei Erfolg wechselt App über den Auth-Listener auf die angemeldete Ansicht.
  }

  return (
    <main className="login">
      <form className="card" onSubmit={handleSubmit}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">A</span>
          <h1>Amica Zeiterfassung</h1>
          <p className="subtitle">Senioren-Alltagshilfe Becker</p>
        </div>

        {/* Verstecktes Feld: nur damit Passwortmanager den Eintrag zuordnen koennen. */}
        <input
          type="text"
          name="username"
          value={APP_USER_EMAIL}
          autoComplete="username"
          readOnly
          hidden
        />

        <label className="field" htmlFor="password">
          Passwort
          <div className="input-row">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
              placeholder="Passwort eingeben"
            />
            <button
              type="button"
              className="ghost"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
            >
              {showPassword ? 'Verbergen' : 'Anzeigen'}
            </button>
          </div>
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="primary" disabled={loading || password.length === 0}>
          {loading ? 'Anmelden …' : 'Anmelden'}
        </button>
      </form>
    </main>
  )
}
