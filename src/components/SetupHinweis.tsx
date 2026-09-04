export default function SetupHinweis({ fehlend }: { fehlend: string[] }) {
  return (
    <main className="login">
      <div className="card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">A</span>
          <h1>Einrichtung fehlt</h1>
        </div>
        <p>
          Die App findet ihre Zugangsdaten nicht. Lege im Projektordner eine Datei
          <code> .env </code> an — am einfachsten als Kopie von <code>.env.example</code> —
          und starte den Entwicklungsserver neu.
        </p>
        <p>Diese Werte fehlen:</p>
        <ul className="missing">
          {fehlend.map((name) => (
            <li key={name}><code>{name}</code></li>
          ))}
        </ul>
        <pre className="snippet">cp .env.example .env</pre>
      </div>
    </main>
  )
}
