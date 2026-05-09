# Kunden-Onboarding — Reservierungs-Tool (Restaurant)

> Komplette Checkliste um in **~30 min** ein neues Reservierungs-Tool für einen Restaurant-Kunden aufzusetzen.
> Geh sie von oben nach unten durch.

---

## ☐ Phase 1 — Daten vom Kunden einholen (5 min)

**Frag den Kunden nach:**

```
Restaurant-Name:             ___________________________
Inhaber (rechtl. Name):      ___________________________
Straße, PLZ, Ort:            ___________________________
Telefon (Geschäftlich):      ___________________________
E-Mail (Kontakt für Gäste):  ___________________________
USt-IdNr (optional):         ___________________________
Maps-Link:                   ___________________________

Service-Email (für Versand): ___________________________
   → Empfehlung: eigene Domain + Brevo. Sonst: Gmail mit App-Passwort.

Tische (Anzahl + Kapazitäten):  ___________________________
Öffnungszeiten pro Tag:         ___________________________
Stornofrist (Std. vor Termin):  ___________________________
Reservierungsdauer (klein/groß):___________________________
```

---

## ☐ Phase 2 — Datenbank anlegen (5 min)

Wähl je nach Kunde **Supabase** (komfortable UI) oder **Neon** (gleicher Provider wie Friseur).

### Variante A: Supabase
1. https://supabase.com → **New project** → Region **Frankfurt** → Name `restaurant-{kunde}`
2. **Project Settings → Database → Connection String** kopieren (Format: `postgresql://postgres.xxx:PWD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`)
3. **SQL Editor** → Inhalt von `server/src/db/migration.sql` reinkopieren → **Run**
   - Das legt automatisch alle Tabellen an + 12 Beispiel-Tische + Default-Settings

### Variante B: Neon
1. https://console.neon.tech → **New project** → Region **EU (Frankfurt)** → Name `restaurant-{kunde}`
2. Connection String kopieren
3. **SQL Editor** → Inhalt von `server/src/db/migration.sql` einfügen → Run

### Settings auf Kundendaten anpassen (beide Varianten)

```sql
UPDATE settings SET
  restaurant_name = 'Ristorante Bella Vista',
  contact_email = 'info@bella-vista.de',
  contact_phone = '+49 30 123456789',
  address = 'Hauptstraße 1, 12345 Berlin',
  maps_url = 'https://maps.google.com/?q=Hauptstraße+1+Berlin',
  opening_hours = '{
    "0": ["12:00","22:00"],
    "1": null,
    "2": ["17:00","22:00"],
    "3": ["17:00","22:00"],
    "4": ["17:00","22:00"],
    "5": ["17:00","23:00"],
    "6": ["12:00","23:00"]
  }'::jsonb,
  duration_short_min = 90,
  duration_long_min = 120,
  party_size_threshold = 6,
  max_party_size_online = 10,
  cancellation_deadline_hours = 4
WHERE id = 1;
```

### Tische anpassen (falls Standard nicht passt)

Standard sind 12 Tische (4× 2er, 4× 4er, 2× 6er, 2× 8er). Falls der Kunde andere Bestuhlung hat:

```sql
DELETE FROM tables;
INSERT INTO tables (name, capacity, pos_x, pos_y, width, height, shape, sort_order) VALUES
  ('Tisch 1', 2, 50, 50, 80, 80, 'rect', 1),
  ('Tisch 2', 4, 200, 50, 100, 80, 'rect', 2),
  ('Tisch 3', 6, 350, 50, 120, 80, 'rect', 3);
-- ... usw.
```

✓ **Verify**: `SELECT count(*) FROM tables;` muss > 0 sein, `SELECT restaurant_name FROM settings;` muss den Kunden-Namen zeigen.

---

## ☐ Phase 3 — Render-Service erstellen (5 min)

1. **Render Dashboard** → **New +** → **Web Service**
2. **Connect GitHub Repository** → `atilakaplan737-byte/reservieurng_1`
3. **Configure**:
   - **Name**: `restaurant-{kunde}` (z.B. `restaurant-bella-vista`)
   - **Region**: Oregon (Free) oder Frankfurt (Paid)
   - **Branch**: `main`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. **Create Web Service**

→ URL kopieren (`https://restaurant-bella-vista.onrender.com`).

---

## ☐ Phase 4 — Environment Variables setzen (10 min)

Im Service → **Environment** → für jede Zeile **Add Environment Variable**:

### Server-Basics (immer gleich)
```
NODE_ENV   = production
PORT       = 3001
```

### Pro Kunde anpassen
```
DATABASE_URL       = (Connection String aus Phase 2)
BASE_URL           = https://restaurant-{kunde}.onrender.com
ADMIN_PASSWORD     = (mind. 8 Zeichen, NICHT admin123/changeme/password)

RESTAURANT_NAME    = Ristorante Bella Vista
RESTAURANT_ADDRESS = Hauptstraße 1, 12345 Berlin
RESTAURANT_PHONE   = +49 30 123456789
RESTAURANT_MAPS_URL= https://maps.google.com/?q=Hauptstraße+1+Berlin

LEGAL_OWNER_NAME   = Hans Mustermann
LEGAL_OWNER_EMAIL  = hans@bella-vista.de
LEGAL_TAX_ID       = (leer wenn Kleinunternehmer)
```

> **Hinweis**: `RESTAURANT_*` ist nur Fallback. Die "echten" Restaurant-Settings kommen aus der DB-Tabelle `settings` (siehe Phase 2). Im Admin-UI kann der Kunde das nachträglich ändern.

### SMTP
```
SMTP_HOST   = smtp.gmail.com
SMTP_PORT   = 587
SMTP_SECURE = false
SMTP_USER   = kunde@gmail.com
SMTP_PASS   = (Gmail App-Passwort)
SMTP_FROM   = Ristorante Bella Vista <kunde@gmail.com>
REPLY_TO    = kunde@gmail.com
```

→ **Save Changes** → Render redeployt (~2 min).

---

## ☐ Phase 5 — End-to-End-Test (5 min)

1. **Öffne** `https://restaurant-{kunde}.onrender.com`
   - ✓ Reservierungs-Wizard lädt
   - ✓ Browser-Tab zeigt Restaurant-Namen
   - ✓ Header zeigt Restaurant + Telefon
   - ✓ Footer zeigt Adresse + Öffnungszeiten + Impressum/Datenschutz-Links

2. **Klick Impressum** — alle Pflichtfelder da?
3. **Klick Datenschutz** — Verantwortlicher korrekt?

4. **Test-Reservierung machen** mit deiner Email
   - ✓ Bestätigungs-Mail kommt an (ggf. Spam → manuell als "Kein Spam")
   - ✓ Stornolink (`/storno/:token`) funktioniert

5. **Admin-Login**: `/admin/login` → mit `ADMIN_PASSWORD` einloggen
   - ✓ Reservierungs-Übersicht lädt
   - ✓ Settings-Page erlaubt Änderung von Öffnungszeiten/Dauer
   - ✓ Tables-Page zeigt alle Tische
   - ✓ FloorPlan-Page zeigt Tisch-Layout

---

## ☐ Phase 6 — Übergabe an den Kunden (5 min)

```
Reservierungs-URL:  https://restaurant-{kunde}.onrender.com
Admin-Login:        https://restaurant-{kunde}.onrender.com/admin
Admin-Passwort:     __________________________

Wichtig:
- Im Admin-Bereich kann der Kunde:
  • Reservierungen sehen, neue eintragen, Status ändern
  • Tische verwalten und Floorplan anpassen
  • Öffnungszeiten + Restaurant-Daten ändern
  • Feiertage einstellen
- Bei Fragen / Tool-Änderungen: melden bei [DEINE-EMAIL]
- Render Free Plan: Service schläft nach 15 min Inaktivität, ~30s Cold Start
```

---

## ⚠️ Häufige Fehler (Troubleshooting)

| Problem | Ursache | Fix |
|---|---|---|
| `❌ ADMIN_PASSWORD ist ein bekanntes Default-Passwort` | admin123/changeme/password | In Render auf was Sicheres ändern |
| `Tabelle existiert nicht` | Migration nicht gelaufen | Phase 2 SQL erneut ausführen |
| Storno-Link 404 | BASE_URL falsch | Auf exakte Render-URL ohne Slash setzen |
| Reservierung schlägt fehl | Keine Tische | `SELECT count(*) FROM tables` prüfen |
| Mail im Spam | Gmail-SMTP ohne Domain | Akzeptieren ODER Brevo + Domain |
| "0 verfügbare Slots" | Öffnungszeiten leer/null | `settings.opening_hours` prüfen |

---

## 📋 Quick-Ref: Alle Env-Vars in einem Block

Zum Copy-Paste in Render (Werte anpassen):

```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres.xxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
BASE_URL=https://restaurant-XXX.onrender.com
ADMIN_PASSWORD=ÄndereDiesesPasswort2026
RESTAURANT_NAME=Ristorante XXX
RESTAURANT_ADDRESS=Hauptstraße 1, 12345 Stadt
RESTAURANT_PHONE=+49 30 123456789
RESTAURANT_MAPS_URL=https://maps.google.com/?q=Hauptstraße+1+Stadt
LEGAL_OWNER_NAME=Vorname Nachname
LEGAL_OWNER_EMAIL=inhaber@restaurant-xxx.de
LEGAL_TAX_ID=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=kunde@gmail.com
SMTP_PASS=16stelligesAppPasswort
SMTP_FROM=Restaurant XXX <kunde@gmail.com>
REPLY_TO=kunde@gmail.com
```
