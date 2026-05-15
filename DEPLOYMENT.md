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
| `TZ` | `Europe/Berlin` |
| `BREVO_API_KEY` | **E-Mail auf Render: Brevo statt SMTP** (siehe unten) |
| `SMTP_FROM` | Absender, z. B. `"Ristorante Bella Vista <adresse@gmail.com>"` |

> ⚠️ **Wichtig:** Render blockt ausgehendes **SMTP** (Port 587/465 laufen in
> „Connection timeout"). Gmail-/SMTP-Versand funktioniert auf Render **nicht**
> zuverlässig. Auf Render daher **`BREVO_API_KEY`** setzen (HTTP-API über Port
> 443) — dann werden die `SMTP_*`-Variablen ignoriert. SMTP nur lokal nutzen.

`NODE_ENV=production`, `PORT=3001` und `TZ=Europe/Berlin` sind in `render.yaml` schon vorbelegt.

---

## 5. Deploy

- Render baut automatisch (~5 Min)
- In den Logs muss `🚀 Server läuft auf http://localhost:3001` erscheinen
- App ist live unter `https://<service>.onrender.com`
- **Storno-Links in Mails zeigen jetzt auf die echte URL und funktionieren weltweit** ✅

---

## 6. E-Mail auf Render: Brevo (kein eigene Domain nötig)

Render blockt SMTP → Versand läuft über die **Brevo HTTP-API**. Setup (~5 Min):

1. Kostenlosen Account bei **[Brevo](https://www.brevo.com)** anlegen (300 Mails/Tag gratis)
2. **Brevo → Settings → Senders**: die Absender-Adresse (z. B. die Gmail-Adresse
   aus `SMTP_FROM`) hinzufügen und per Bestätigungsmail **verifizieren**
   *(keine eigene Domain erforderlich)*
3. **Brevo → SMTP & API → API Keys**: neuen API-Key erzeugen (`xkeysib-…`)
4. In Render → Environment setzen:
   ```
   BREVO_API_KEY=xkeysib-…
   SMTP_FROM="Ristorante Bella Vista <adresse@gmail.com>"   # = verifizierter Sender
   REPLY_TO=adresse@gmail.com
   ```
5. Render redeployt → im Log muss `✅ Brevo aktiv (Absender …)` stehen
6. Testreservierung → Bestätigungsmail muss ankommen

Sobald `BREVO_API_KEY` gesetzt ist, werden die `SMTP_*`-Variablen ignoriert.
Lokal (ohne SMTP-Block) kann weiter SMTP genutzt werden — einfach `BREVO_API_KEY`
in der lokalen `.env` weglassen.

**Beste Zustellbarkeit (optional, mit eigener Domain):** Domain in Brevo
verifizieren und **SPF/DKIM/DMARC**-DNS-Records beim Domain-Provider eintragen —
dann landen Mails auch bei Web.de/Outlook sicher im Posteingang.

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
- ⚠️ **Wichtig:** Während des Schlafs laufen die internen Cronjobs (E-Mail-Erinnerungen
  24h/4h vorher, Session-Cleanup) **nicht**. Ohne Keep-Alive werden Erinnerungen
  unzuverlässig versendet.
- Optionen:
  - **Starter Plan ($7/Monat)** → kein Sleep, Cronjobs laufen zuverlässig
  - **Cron-Ping** alle 10 Min auf `/api/health` (z. B. via [cron-job.org](https://cron-job.org)) →
    hält den Service wach, damit die Reminder-Cronjobs feuern
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
