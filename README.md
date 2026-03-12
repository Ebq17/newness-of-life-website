# Newness of Life – Website + Admin

## Lokaler Start

1. Admin/API-Server starten:

```bash
npm run admin
```

Dann Admin öffnen: `http://localhost:3001/admin/`

2. Website bauen:

```bash
npm run build
```

## Admin ohne Localhost (Netlify)

Für Online-Bearbeitung (inkl. Bilder) wird jetzt Decap CMS unter `https://newnessoflife.netlify.app/admin/cms.html` genutzt.

In Netlify einmalig aktivieren:

1. `Site settings -> Identity -> Enable Identity`
2. `Identity -> Registration preferences -> Invite only` (empfohlen)
3. `Identity -> Services -> Git Gateway -> Enable Git Gateway`
4. Benutzer einladen und per E-Mail bestätigen

Danach kannst du Inhalte direkt online bearbeiten und veröffentlichen, ohne lokalen Server.

## Tests

```bash
npm test
```

## E-Mail (Kontaktformular)

Der Endpoint `POST /api/contact` (lokaler Admin-Server) verschickt E-Mails über Resend.
Auf Netlify nutzt das Kontaktformular als Fallback `/.netlify/functions/contact-email` (Mail an Gemeinde + Bestätigung an Absender).
Falls der Mail-Service nicht konfiguriert ist, wird das Formular trotzdem als Netlify Form gespeichert (kein Datenverlust).

Der Endpoint `POST /api/donations` verschickt eine Spendenbestaetigung mit PDF-Anhang an den Spender und eine interne Kopie an die Gemeinde.
Auf Netlify wird dafuer automatisch `/.netlify/functions/donations` verwendet (gleiche Nutzlast).

- Konfiguration über `.env` (siehe `.env.example`)
- Wichtige Variablen:
  - `RESEND_API_KEY`
  - `CONTACT_RESEND_API_KEY` (optional, überschreibt `RESEND_API_KEY` nur für Kontakt)
  - `CHURCH_EMAIL` (primäre Zieladresse)
  - `TO_EMAIL` (Legacy-Fallback)
  - `FROM_EMAIL`
  - `NOREPLY_EMAIL`
  - Optional fuer Kontakt-Mails:
    - `CONTACT_TO_EMAIL`
    - `CONTACT_FROM_EMAIL`
    - `CONTACT_NOREPLY_EMAIL`
    - `CONTACT_ATTACH_PDF` (`1` aktiviert PDF-Anhang)
  - Optional fuer Spenden-Mails:
    - `DONATION_TO_EMAIL`
    - `DONATION_FROM_EMAIL`
    - `DONATION_NOREPLY_EMAIL`
    - `ORG_NAME`
    - `SITE_URL`

Hinweis: Wenn ein API-Key jemals in GitHub gelandet ist, bitte im Resend-Dashboard rotieren und den alten Key deaktivieren.
