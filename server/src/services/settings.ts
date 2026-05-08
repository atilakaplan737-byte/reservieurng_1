import { getDb } from '../db/database';

export interface OpeningHours {
  // 0 = Sonntag, 6 = Samstag, null = geschlossen, sonst [open, close] als HH:mm
  [weekday: string]: [string, string] | null;
}

export interface Settings {
  restaurant_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  maps_url: string | null;
  opening_hours: OpeningHours;
  duration_short_min: number;
  duration_long_min: number;
  party_size_threshold: number;
  max_party_size_online: number;
  min_lead_minutes: number;
  cancellation_deadline_hours: number;
}

let cache: { value: Settings; ts: number } | null = null;
const CACHE_MS = 5_000;

export async function getSettings(force = false): Promise<Settings> {
  if (!force && cache && Date.now() - cache.ts < CACHE_MS) return cache.value;

  const db = getDb();
  const res = await db.query('SELECT * FROM settings WHERE id = 1');
  const row = res.rows[0];

  const settings: Settings = row
    ? {
        restaurant_name: row.restaurant_name,
        contact_email: row.contact_email,
        contact_phone: row.contact_phone,
        address: row.address,
        maps_url: row.maps_url,
        opening_hours: row.opening_hours,
        duration_short_min: row.duration_short_min,
        duration_long_min: row.duration_long_min,
        party_size_threshold: row.party_size_threshold,
        max_party_size_online: row.max_party_size_online,
        min_lead_minutes: row.min_lead_minutes,
        cancellation_deadline_hours: row.cancellation_deadline_hours,
      }
    : defaultSettings();

  cache = { value: settings, ts: Date.now() };
  return settings;
}

export function invalidateSettingsCache(): void {
  cache = null;
}

export function durationFor(partySize: number, settings: Settings): number {
  return partySize >= settings.party_size_threshold
    ? settings.duration_long_min
    : settings.duration_short_min;
}

function defaultSettings(): Settings {
  return {
    restaurant_name: process.env.RESTAURANT_NAME || 'Restaurant',
    contact_email: process.env.SMTP_FROM || null,
    contact_phone: process.env.RESTAURANT_PHONE || null,
    address: process.env.RESTAURANT_ADDRESS || null,
    maps_url: process.env.RESTAURANT_MAPS_URL || null,
    opening_hours: {
      '0': ['12:00', '22:00'],
      '1': null,
      '2': ['17:00', '22:00'],
      '3': ['17:00', '22:00'],
      '4': ['17:00', '22:00'],
      '5': ['17:00', '23:00'],
      '6': ['12:00', '23:00'],
    },
    duration_short_min: 90,
    duration_long_min: 120,
    party_size_threshold: 6,
    max_party_size_online: 10,
    min_lead_minutes: 60,
    cancellation_deadline_hours: 3,
  };
}
