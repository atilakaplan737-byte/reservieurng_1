# 🚀 Deployment Guide — Reservierungssystem

Dieses Dokument beschreibt, wie du das System auf **Render.com** deployst, sodass es weltweit unter einer **HTTPS-URL** erreichbar ist (Storno-Links in Mails funktionieren dann für jeden Empfänger).

---

## Architektur

```
┌─────────────────┐
│  Gast / Admin   │
│  (Browser/Phone)│
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐         ┌──────────────┐
│  Render.com     │ ◄─────► │   Supabase   │
│  (Backend +     │         │  (Postgres)  │
│   Frontend)     │         └──────────────┘
└─────────────────┘
```

Backend serviert in Production auch das gebaute Frontend → **ein einziges Deployment**.

---

## 1. Supabase einrichten

Siehe [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Kurz:

1. Projekt auf [supabase.com](https://supabase.com) anlegen
2. SQL Editor → Inhalt von `server/src/db/migration.sql` einfügen → Run
3. **Connection-String** kopieren:
   `Project Settings → Database → Connection pooling → Transaction mode (Port 6543)`

⚠️ **Wichtig**: Pooling-URL (Port 6543) verwenden, nicht den direkten Port. Render Free Tier hat begrenzte Connections.

---

## 2. Code zu GitHub pushen

```bash
cd "Templates /reservierung_1"
git init
git add .
git commit -m "Initial deployment setup"
git branch -M main
git remote add origin https://github.com/<dein-user>/reservierung-bellavista.git
git push -u origin main
```

`.env` wird durch `.gitignore` ausgeschlossen — Geheimnisse landen nicht im Repo.

---

## 3. Render-Service anlegen

1. [render.com](https://render.com) → Sign up mit GitHub
2. **New +** → **Web Service**
3. Repository auswählen: `reservierung-bellavista`
4. Render erkennt `render.yaml` automatisch ✅
5. Service-Name vergeben → daraus wird die URL: `https://<name>.onrender.com`

---

## 4. Environment Variables in Render setzen

Im Service-Dashboard → **Environment**:

| Variable | Wert |
|---|---|
| `DATABASE_URL` | Supabase-Pooling-URL (Port 6543) mit `?sslmode=require` |
| `ADMIN_PASSWORD` | Sicheres Admin-PW |
| `BASE_URL` | `https://<dein-service>.onrender.com` ← die URL die Render dir gibt |
| `RESTAURANT_NAME` | z. B. `Ristorante Bella Vista` |
| `RESTAURANT_ADDRESS` | z. B. `Hauptstraße 1, 12345 Stadt` |
| `RESTAURANT_PHONE` | z. B. `+49 30 12345678` |
| `RESTAURANT_MAPS_URL` | Google-Maps-Link |
| `SMTP_HOST` | `smtp.web.de` (oder Resend/Postmark/etc.) |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | Mail-Adresse |
| `SMTP_PASS` | App-Passwort |
| `SMTP_FROM` | `"Restaurant-Name <reservierung@…>"` |

`NODE_ENV=production` und `PORT=3001` sind in `render.yaml` schon gesetzt.

---

## 5. Deploy

- Render baut automatisch (~5 Min)
- In den Logs muss `🚀 Server läuft auf http://localhost:3001` erscheinen
- App ist live unter `https://<service>.onrender.com`
- **Storno-Links in Mails zeigen jetzt auf die echte URL und funktionieren weltweit** ✅

---

## 6. Mail-Setup für „landet überall im Posteingang"

Damit Bestätigungs-Mails nicht im Spam landen — **egal welcher Empfänger-Provider**:

1. **Eigene Domain** des Restaurants (z. B. `bellavista.de`)
2. Account bei **[Resend](https://resend.com)** (3 000 Mails/Monat gratis) oder **Postmark**
3. Domain in Resend verifizieren → Resend zeigt **DNS-Records** an
4. **SPF, DKIM, DMARC** beim Domain-Provider eintragen (Copy-Paste)
5. SMTP-Daten in Render setzen:
   ```
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=587
   SMTP_USER=resend
   SMTP_PASS=<API-Key von Resend>
   SMTP_FROM=reservierung@bellavista.de
   ```
6. Test-Mail an Web.de + Gmail + Outlook → muss überall im Posteingang landen

Ohne diese Schritte: Web.de-/Outlook-Empfänger landen oft im Spam.

---

## 7. Custom Domain (optional)

Render → **Settings** → **Custom Domain**:
1. `reservierung.bellavista.de` hinzufügen
2. DNS-CNAME beim Domain-Provider:
   ```
   CNAME  reservierung  →  <service>.onrender.com
   ```
3. ~10 Min warten für SSL-Cert
4. **`BASE_URL`** in Render auf die neue Domain umstellen

---

## 8. Free-Tier-Hinweis

Render Free Tier schläft nach **15 Min ohne Traffic** ein:
- Erste Request danach: ~30 Sek Wartezeit
- Optionen:
  - **Starter Plan ($7/Monat)** → kein Sleep, schnellere Cold-Starts
  - **Cron-Ping** alle 10 Min auf `/api/info` (z. B. via [cron-job.org](https://cron-job.org))
  - Für Demo erstmal Free → bei echtem Verkauf Starter

---

## 9. Updates deployen

```bash
git push origin main
```

Render baut und deployt automatisch.

---

## Troubleshooting

| Problem | Lösung |
|---|---|
| `DATABASE_URL nicht gesetzt` | Env-Var im Render-Dashboard fehlt |
| `Tabelle 'reservations' existiert nicht` | `migration.sql` in Supabase noch nicht ausgeführt |
| Build failed | Render-Logs lesen — meist Node-Version (`engines: node 18-20` in `package.json`) |
| Storno-Link 404 | `BASE_URL` zeigt nicht auf die Render-URL — prüfen |
| Mails kommen nicht | SMTP-Creds prüfen, ohne SMTP wird in Konsole geloggt |
| App langsam beim ersten Request | Free-Tier-Sleep — siehe Punkt 8 |
