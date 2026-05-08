# Setup-Anleitung

## 1. Voraussetzungen

- Node.js 18 oder 20 (`node --version`)
- Ein Supabase-Account (kostenloser Plan reicht für den Start)
- Optional: SMTP-Zugangsdaten (Gmail-App-Passwort, eigener Hoster, etc.) – ohne SMTP werden Mails nur in die Konsole geloggt.

## 2. Supabase einrichten

Siehe [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

Kurzfassung:
1. Projekt erstellen auf [supabase.com](https://supabase.com)
2. SQL Editor öffnen → Inhalt von `server/src/db/migration.sql` einfügen → Run
3. Connection-String kopieren (Project Settings → Database → Connection String → "Transaction pooler" / Port 5432, am Ende `?sslmode=require` anhängen)

## 3. .env anlegen

```bash
cp .env.example .env
```

Werte ausfüllen:
- `DATABASE_URL` (von Supabase)
- `ADMIN_PASSWORD` (Passwort für das Admin-Dashboard – wird beim Server-Start gehasht und in DB gespeichert; Änderung in der .env überschreibt das gespeicherte Passwort beim nächsten Start)
- `RESTAURANT_NAME`, `RESTAURANT_PHONE`, `RESTAURANT_ADDRESS`, `RESTAURANT_MAPS_URL` (optional als Fallback – im Admin-Dashboard überschreibbar)
- `SMTP_*` (optional)

## 4. Dependencies installieren

```bash
npm run install:all
```

## 5. Dev-Server starten

```bash
npm run dev
```

- Customer-Frontend: http://localhost:5173
- Admin-Dashboard: http://localhost:5173/admin
- Backend-API: http://localhost:3001/api

## 6. Erste Schritte im Admin-Dashboard

1. Mit dem `ADMIN_PASSWORD` aus `.env` einloggen
2. **Einstellungen** öffnen → Restaurant-Daten und Öffnungszeiten anpassen
3. **Tische** → ggf. weitere Tische ergänzen oder bestehende anpassen
4. **Floor Plan** → Tische per Drag-&-Drop platzieren
5. **Tische → Kombinationen** → Tische zusammenlegbar machen, falls große Gruppen rein sollen

## 7. Production-Build

```bash
npm run build
npm start
```

Der Server liefert dann auch das gebaute Frontend unter Port 3001 aus
(`NODE_ENV=production` setzen).

## Häufige Probleme

**„Schema fehlt – migration.sql nicht ausgeführt"**
→ Migration in Supabase SQL Editor noch ausführen.

**Login-Fehler „Falsches Passwort"**
→ Beim Start passt der Server das gespeicherte Hash an `ADMIN_PASSWORD` aus der `.env` an.
   Wenn das nicht klappt: in Supabase einen Eintrag in `admin_users` löschen und Server neu starten.

**Reminder-Mails kommen nicht**
→ Cron läuft alle 15 Min. Im Dev-Modus muss der Server laufen, damit der Cron triggert.
   Ohne SMTP-Konfig werden Mails nur in die Konsole geloggt.

**Stornierung schlägt fehl**
→ Stornofrist (Default: 3h vor Reservierung) konfigurierbar unter Einstellungen.
