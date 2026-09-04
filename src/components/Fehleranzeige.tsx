import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { fehler: Error | null }

/**
 * Faengt Fehler aus der Oberflaeche ab, damit statt einer weissen Seite
 * eine lesbare Meldung erscheint.
 */
export default class Fehleranzeige extends Component<Props, State> {
  state: State = { fehler: null }

  static getDerivedStateFromError(fehler: Error): State {
    return { fehler }
  }

  componentDidCatch(fehler: Error, info: ErrorInfo) {
    console.error('Fehler in der Oberflaeche:', fehler, info)
  }

  render() {
    if (!this.state.fehler) return this.props.children

    return (
      <main className="login">
        <div className="card">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">A</span>
            <h1>Da ist etwas schiefgelaufen</h1>
          </div>
          <p className="error">{this.state.fehler.message}</p>
          <button className="primary" onClick={() => window.location.reload()}>
            Seite neu laden
          </button>
        </div>
      </main>
    )
  }
}
