# Newness of Life – Website

Website der Freikirche Newness of Life in Mainz: https://newnessoflife.de

## Inhalte bearbeiten (ohne Code)

**https://newnessoflife.de/admin** – E-Mail eingeben, Anmelde-Link aus dem Postfach öffnen, fertig.
Freigeschaltete Adressen: `newnessoflife@clgi.org`, `emma_quainoo@yahoo.de`
(änderbar über die Netlify-Umgebungsvariable `ADMIN_EMAILS`, kommagetrennt).

Nach „Speichern“ wird die Website von Netlify automatisch neu gebaut (ca. 1–2 Minuten).

## Aufbau

| Ordner / Datei | Inhalt |
| --- | --- |
| `data/*.json`, `data/pages/*.json` | Alle Texte, Bilder, Termine (werden vom Admin bearbeitet). Felder mit Endung `_en` sind die englische Version. |
| `src/pages/`, `src/partials/` | HTML-Vorlagen. Elemente mit `data-t="pfad"` werden beim Bauen mit Inhalten gefüllt. |
| `build.js` | Erzeugt die fertigen Seiten (`index.html` usw.) und `sitemap.xml`. |
| `css/site.css`, `js/site.js` | Design und Website-Skript. |
| `admin/` | Admin-Oberfläche. |
| `netlify/functions/admin-api.js` | Admin-Backend: Anmelde-Link per E-Mail (Brevo), Speichern ins GitHub-Repo. |
| `netlify/functions/contact-email.js` | Kontaktformular. |

## Netlify-Umgebungsvariablen

- `GITHUB_TOKEN` – Fine-grained Token für dieses Repository mit Berechtigung *Contents: Read and write* (für den Admin).
- `BREVO_API_KEY` – E-Mail-Versand (Kontaktformular und Admin-Anmeldung).
- optional: `ADMIN_EMAILS`, `ADMIN_SECRET`, `NOREPLY_EMAIL`, `FROM_EMAIL`, `CHURCH_EMAIL`.

## Lokal entwickeln

```bash
npm install
npm run build   # Seiten bauen
npm run serve   # http://localhost:8080
npm test
```
