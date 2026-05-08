# Restaurant Reservation System

Ein hochwertiges, sofort einsatzbereites Online-Reservierungssystem für Restaurants.
Reserviert Tische auf 30-Minuten-Basis mit echter Tischlogik, automatischer Tisch-Zuweisung,
Kombinations-Erkennung für große Gruppen und einem Admin-Dashboard mit Floor-Plan-Live-View.

## Features

### Für Gäste
- 4-stufiger Reservierungs-Wizard (Datum & Personen → Uhrzeit → Daten → Bestätigung)
- 30-Minuten-Slot-Anzeige, Reservierungsdauer 90 Min. (≥6 Personen 120 Min. – konfigurierbar)
- Automatische Tisch-Zuweisung im Hintergrund (kleinster passender Tisch)
- Tisch-Kombinationen für größere Gruppen
- Bestätigungs-E-Mail mit Storno-Link
- Reminder-Mails 24h und 4h vor der Reservierung
- Stornierung bis konfigurierter Frist (Default: 3h vorher)

### Für das Personal (Admin-Dashboard)
- **Live-Floor-Plan**: Tische in Vogelperspektive, Status-Farben (frei/reserviert/belegt)
- **Drag-&-Drop-Editor** zum einmaligen Platzieren der Tische beim Setup
- **Walk-ins** direkt am Tisch eintragen (Tisch klicken → belegen)
- **Tisch freigeben** wenn Gäste früher gehen (Tisch klicken)
- Reservierungen manuell erstellen, bearbeiten, stornieren, löschen
- Status-Verwaltung (bestätigt / abgeschlossen / no-show / storniert)
- Tische, Tisch-Kombinationen und Feiertage verwalten
- Öffnungszeiten pro Wochentag konfigurieren
- Statistiken (Reservierungen pro Tag/Uhrzeit, Auslastung)

## Tech-Stack

- **Backend**: Node.js + Express + TypeScript, PostgreSQL (Supabase), Nodemailer
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + React Router
- **Cron**: node-cron (Reminder-Mails alle 15 Min., Session-Cleanup täglich)

## Quick Start

```bash
# 1. Dependencies installieren
npm run install:all

# 2. .env anlegen (siehe .env.example)
cp .env.example .env

# 3. Supabase-Schema einspielen (siehe SUPABASE_SETUP.md)
# In Supabase SQL Editor: server/src/db/migration.sql ausführen

# 4. Dev-Server starten
npm run dev

# Customer:  http://localhost:5173
# Admin:     http://localhost:5173/admin
```

Detaillierte Anleitung: [SETUP.md](SETUP.md)

## Projekt-Struktur

```
reservierung_1/
├── server/                       Node-Backend
│   ├── src/
│   │   ├── db/                   Schema + DB-Connection
│   │   ├── routes/               REST-Endpoints
│   │   ├── services/             Tisch-Zuweisung, Verfügbarkeit, Email
│   │   ├── middleware/           Auth
│   │   └── utils/                Time-Helpers
│   └── package.json
├── client/                       React-Frontend
│   ├── src/
│   │   ├── components/           Layout, ProgressBar
│   │   ├── lib/                  api, format
│   │   ├── pages/
│   │   │   ├── booking/          4-Step Wizard
│   │   │   ├── cancel/           Storno-Page
│   │   │   └── admin/            Dashboard, Floor Plan, Reservierungen, Tische, Settings, Stats
│   │   └── ...
│   └── package.json
├── .env.example
└── package.json                  Root: konkurrierende dev-Server
```

## Tisch-Zuweisungs-Algorithmus

1. Reservierung kommt mit Zeitraum + Personenzahl rein
2. System sucht alle Tische mit `capacity ≥ partySize`, die in dem Zeitraum frei sind
3. Wählt den **kleinsten passenden Tisch** (damit größere Tische für größere Gruppen frei bleiben)
4. Wenn keiner einzeln passt: prüft konfigurierte **Tisch-Kombinationen** (z.B. Tisch 5+6 = 8er-Tafel)
5. Wenn auch das nicht reicht: Hinweis „Bitte rufen Sie uns an"

## Verkauf an Restaurants

Dieses Template ist Single-Tenant: ein Supabase-Projekt + ein Deployment pro Restaurant.
Anpassung erfolgt komplett im Admin-Dashboard – kein Code muss geändert werden:

1. Restaurant-Name, Kontakt, Adresse, Maps-Link
2. Öffnungszeiten pro Wochentag
3. Tische anlegen + im Floor-Plan-Editor anordnen
4. Tisch-Kombinationen definieren
5. Feiertage eintragen
6. Reservierungs-Regeln (Dauer, Stornofrist, max. Personen online)
