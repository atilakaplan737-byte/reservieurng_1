-- Restaurant Reservation System Schema
-- Single-Tenant: 1 Restaurant pro Deployment / Supabase-Projekt
-- Diese Datei in Supabase SQL Editor ausführen.

-- =============================================================
-- Tische
-- =============================================================
CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  pos_x INTEGER NOT NULL DEFAULT 50,
  pos_y INTEGER NOT NULL DEFAULT 50,
  width INTEGER NOT NULL DEFAULT 80,
  height INTEGER NOT NULL DEFAULT 80,
  shape TEXT NOT NULL DEFAULT 'rect' CHECK (shape IN ('rect', 'circle')),
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- Tisch-Kombinationen (welche Tische dürfen zusammengelegt werden)
-- z.B. Tisch 4 + 5 → 8er-Tafel
-- =============================================================
CREATE TABLE IF NOT EXISTS table_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  table_ids INTEGER[] NOT NULL,
  combined_capacity INTEGER NOT NULL CHECK (combined_capacity > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- Reservierungen
-- =============================================================
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  table_ids INTEGER[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  walk_in BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  cancellation_token TEXT UNIQUE,
  reminder_24h_sent_at TIMESTAMPTZ,
  reminder_4h_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_reservations_start_time ON reservations(start_time);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_token ON reservations(cancellation_token);
CREATE INDEX IF NOT EXISTS idx_reservations_reminders ON reservations(status, start_time)
  WHERE status = 'confirmed' AND (reminder_24h_sent_at IS NULL OR reminder_4h_sent_at IS NULL);

-- =============================================================
-- Feiertage (Restaurant geschlossen)
-- =============================================================
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- Einstellungen (1 Zeile, Restaurant-weit)
-- =============================================================
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  restaurant_name TEXT NOT NULL DEFAULT 'Restaurant',
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  maps_url TEXT,
  -- Öffnungszeiten als JSON: { "0": null, "1": ["17:00","22:00"], ... }
  -- 0 = Sonntag, 6 = Samstag. null = geschlossen.
  opening_hours JSONB NOT NULL DEFAULT '{
    "0": ["12:00","22:00"],
    "1": null,
    "2": ["17:00","22:00"],
    "3": ["17:00","22:00"],
    "4": ["17:00","22:00"],
    "5": ["17:00","23:00"],
    "6": ["12:00","23:00"]
  }'::jsonb,
  duration_short_min INTEGER NOT NULL DEFAULT 90,
  duration_long_min INTEGER NOT NULL DEFAULT 120,
  party_size_threshold INTEGER NOT NULL DEFAULT 6,
  max_party_size_online INTEGER NOT NULL DEFAULT 10,
  min_lead_minutes INTEGER NOT NULL DEFAULT 60,
  cancellation_deadline_hours INTEGER NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- Admin-Login & Sessions
-- =============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE DEFAULT 'admin',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id SERIAL PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);

-- =============================================================
-- Beispiel-Tische (Seed) – nur einfügen wenn Tabelle leer ist
-- =============================================================
INSERT INTO tables (name, capacity, pos_x, pos_y, width, height, shape, sort_order)
SELECT * FROM (VALUES
  ('Tisch 1',  2,  60,  60,  90,  90, 'rect',  1),
  ('Tisch 2',  2, 180,  60,  90,  90, 'rect',  2),
  ('Tisch 3',  2, 300,  60,  90,  90, 'rect',  3),
  ('Tisch 4',  2, 420,  60,  90,  90, 'rect',  4),
  ('Tisch 5',  4,  60, 200, 120,  90, 'rect',  5),
  ('Tisch 6',  4, 220, 200, 120,  90, 'rect',  6),
  ('Tisch 7',  4, 380, 200, 120,  90, 'rect',  7),
  ('Tisch 8',  4, 540, 200, 120,  90, 'rect',  8),
  ('Tisch 9',  6,  60, 350, 160, 100, 'rect',  9),
  ('Tisch 10', 6, 260, 350, 160, 100, 'rect', 10)
) AS v(name, capacity, pos_x, pos_y, width, height, shape, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM tables);

-- Beispiel-Tisch-Kombinationen
INSERT INTO table_groups (name, table_ids, combined_capacity)
SELECT * FROM (VALUES
  ('Tisch 5+6 zusammen', ARRAY[(SELECT id FROM tables WHERE name='Tisch 5'),(SELECT id FROM tables WHERE name='Tisch 6')], 8),
  ('Tisch 7+8 zusammen', ARRAY[(SELECT id FROM tables WHERE name='Tisch 7'),(SELECT id FROM tables WHERE name='Tisch 8')], 8),
  ('Tisch 9+10 zusammen', ARRAY[(SELECT id FROM tables WHERE name='Tisch 9'),(SELECT id FROM tables WHERE name='Tisch 10')], 12)
) AS v(name, table_ids, combined_capacity)
WHERE NOT EXISTS (SELECT 1 FROM table_groups);

-- Default-Settings (nur falls noch keine Zeile existiert)
INSERT INTO settings (id, restaurant_name)
VALUES (1, 'Ristorante Bella Vista')
ON CONFLICT (id) DO NOTHING;
