# Amica Zeiterfassung

Zeiterfassung für die Senioren-Alltagshilfe Becker.
Aktueller Stand: **Login** — die App hat nur einen Benutzer, deshalb wird beim
Anmelden ausschließlich das Passwort abgefragt.

## Technik

- Vite + React + TypeScript
- Supabase Auth (`signInWithPassword`), Session bleibt im Browser gespeichert
- Supabase-Projekt: `Amica Zeiterfassung` (Org: Amica Alltagshilfe Becker)

## Einrichtung

```bash
npm install
npm run dev
```

Die Supabase-Projekt-URL und der öffentliche Publishable Key sind fest im
Code hinterlegt (`src/lib/supabase.ts`) — beides ist laut Supabase für den
Browser gedacht und nicht geheim, der Zugriffsschutz läuft über Row Level
Security. Für einen abweichenden Zugang lässt sich optional eine `.env`
(siehe `.env.example`) anlegen, die diese Werte überschreibt.

## Bereitstellung auf GitHub Pages

Ein Workflow (`.github/workflows/deploy-pages.yml`) baut die App bei jedem
Push auf `main` und veröffentlicht sie automatisch auf GitHub Pages.
Einmalig einzurichten: **Settings → Pages → Build and deployment → Source**
auf **GitHub Actions** stellen.

Wichtig: GitHub Pages liefert nur statische Dateien aus. Der Quellcode
(`src/`) läuft im Browser nicht direkt — es muss immer der **Build**
(`dist/`, per Workflow oder `npm run build`) veröffentlicht werden, nicht
der Rohcode.

## Benutzer anlegen (einmalig)

Im Supabase-Dashboard unter **Authentication → Users → Add user**:

1. E-Mail exakt so eintragen wie in `VITE_APP_USER_EMAIL` (Standard: `alltagshilfe@amica.local`)
2. Passwort vergeben — das ist das Passwort für den Login
3. **Auto Confirm User** aktivieren

Danach reicht auf der Login-Seite das Passwort.

Empfehlung: In den Auth-Einstellungen die Selbstregistrierung
(*Allow new users to sign up*) deaktivieren, damit wirklich nur dieses eine
Konto existiert.

## Nächste Schritte

- Tabellen für Klienten, Einsätze und Zeiteinträge
- Erfassungsansicht (Start/Stopp bzw. manuelle Eingabe)
- Monatsauswertung als Export
