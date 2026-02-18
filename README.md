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

Der Endpoint `POST /api/contact` verschickt E-Mails über Resend.

- Konfiguration über `.env` (siehe `.env.example`)
- Wichtige Variablen:
  - `RESEND_API_KEY`
  - `TO_EMAIL`
  - `FROM_EMAIL`
  - `NOREPLY_EMAIL`

Hinweis: Wenn ein API-Key jemals in GitHub gelandet ist, bitte im Resend-Dashboard rotieren und den alten Key deaktivieren.
