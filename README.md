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

## Funktionen

**Startseite — Klienten**
- Übersicht aller Klienten mit Foto, Name und wichtigen Informationen
- Klienten anlegen (Name, Freitext-Informationen, optionales Foto)
- Klienten löschen; die erfassten Zeiten werden dabei mitgelöscht

**Klientenseite — Zeiten**
- Zeiterfassung je Klient: Datum, Von/Bis, die Dauer wird berechnet
- Freitextfeld für eine kurze Information zum Einsatz
- Unterschriftenfeld: öffnet ein Fenster, in dem der Kunde mit dem Finger
  unterschreibt (Pointer Events, funktioniert mit Finger, Stift und Maus)
- Einträge sind nach Monat gruppiert, je Monat mit Stundensumme

## Datenmodell

| Tabelle | Zweck |
| --- | --- |
| `clients` | Klienten: Name, Informationen, Pfad zum Foto |
| `time_entries` | Zeiteinträge je Klient inkl. Notiz und Unterschrift |

Beide Tabellen haben Row Level Security: nur angemeldete Zugriffe sind
erlaubt, anonyme sehen nichts.

Klientenfotos liegen im **privaten** Storage-Bucket `client-photos` und
werden nur über kurzlebige signierte Links ausgeliefert — es handelt sich um
Personendaten, die nicht öffentlich abrufbar sein sollen. Unterschriften
werden als PNG direkt am Zeiteintrag gespeichert.

## Nächste Schritte

- Zeiteinträge nachträglich bearbeiten
- Monatsauswertung als PDF- oder Excel-Export
