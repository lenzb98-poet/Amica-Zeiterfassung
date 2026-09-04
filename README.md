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
cp .env.example .env   # wichtig: ohne .env startet die App nicht
npm run dev
```

Die Datei `.env` ist bewusst nicht eingecheckt. Fehlt sie, zeigt die App
statt einer weißen Seite einen Hinweis, welche Werte fehlen.

Variablen in `.env`:

| Variable | Bedeutung |
| --- | --- |
| `VITE_SUPABASE_URL` | URL des Supabase-Projekts |
| `VITE_SUPABASE_ANON_KEY` | Publishable Key (öffentlich, unkritisch) |
| `VITE_APP_USER_EMAIL` | Konto des einzigen Benutzers — wird intern beim Login verwendet |

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
