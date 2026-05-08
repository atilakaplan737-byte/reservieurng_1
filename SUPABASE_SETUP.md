# Supabase Setup

## 1. Projekt anlegen

1. [supabase.com](https://supabase.com) → Sign up / Login
2. „New Project" → Name, Region (z.B. Frankfurt), Datenbank-Passwort vergeben
3. Warten bis das Projekt grün ist (~1–2 Min.)

## 2. Schema einspielen

1. Linke Sidebar → **SQL Editor** → „New Query"
2. Inhalt von `server/src/db/migration.sql` komplett einfügen
3. **Run** klicken
4. Erfolgsmeldung abwarten

Die Migration ist idempotent – kann mehrfach ausgeführt werden, ohne Daten zu verlieren.

## 3. Connection-String holen

1. Linke Sidebar → **Project Settings** (Zahnrad) → **Database**
2. Abschnitt „Connection String" → Tab **Transaction pooler** wählen (Port 5432)
3. Kopieren – Format:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```
4. `[YOUR-PASSWORD]` durch das beim Anlegen vergebene DB-Passwort ersetzen
5. In `.env` als `DATABASE_URL` eintragen

## 4. Verifizieren

Nach Server-Start solltest du im Log sehen:
```
✅ Datenbank verbunden. 10 aktive Tische.
✅ Admin-User angelegt (Username: admin, Passwort: aus .env)
🚀 Server läuft auf http://localhost:3001
```

## 5. Daten prüfen

Im Supabase Dashboard unter **Table Editor**:
- `tables` → 10 Beispiel-Tische
- `table_groups` → 3 Beispiel-Kombinationen
- `settings` → 1 Zeile mit Default-Werten
- `holidays` → leer
- `reservations` → leer
- `admin_users` → 1 Zeile (admin)

Alles davon ist im Admin-Dashboard editierbar – keine SQL-Kenntnisse nötig.
