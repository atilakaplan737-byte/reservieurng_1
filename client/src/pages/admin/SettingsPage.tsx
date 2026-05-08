import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { fmtDateShort } from '../../lib/format';
import type { Holiday, Settings } from '../../types';

const DAYS: { wd: string; label: string }[] = [
  { wd: '1', label: 'Montag' },
  { wd: '2', label: 'Dienstag' },
  { wd: '3', label: 'Mittwoch' },
  { wd: '4', label: 'Donnerstag' },
  { wd: '5', label: 'Freitag' },
  { wd: '6', label: 'Samstag' },
  { wd: '0', label: 'Sonntag' },
];

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function load() {
    const [s, h] = await Promise.all([api.adminGetSettings(), api.adminGetHolidays()]);
    setSettings(s);
    setHolidays(h);
  }

  useEffect(() => {
    load();
  }, []);

  if (!settings) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="inline-block w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await api.adminUpdateSettings({
        restaurant_name: settings.restaurant_name,
        contact_email: settings.contact_email || undefined,
        contact_phone: settings.contact_phone || undefined,
        address: settings.address || undefined,
        maps_url: settings.maps_url || undefined,
        opening_hours: settings.opening_hours,
        duration_short_min: settings.duration_short_min,
        duration_long_min: settings.duration_long_min,
        party_size_threshold: settings.party_size_threshold,
        max_party_size_online: settings.max_party_size_online,
        min_lead_minutes: settings.min_lead_minutes,
        cancellation_deadline_hours: settings.cancellation_deadline_hours,
      });
      setSettings(updated);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  function setDayHours(wd: string, value: [string, string] | null) {
    setSettings({ ...settings!, opening_hours: { ...settings!.opening_hours, [wd]: value } });
  }

  async function addHoliday(date: string, name: string) {
    await api.adminCreateHoliday({ date, name });
    load();
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl text-white">Einstellungen</h1>
          <p className="text-gray-400 text-sm mt-1">Restaurant-Stammdaten, Öffnungszeiten und Regeln.</p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-gray-500">Gespeichert {savedAt.toLocaleTimeString('de-DE')}</span>}
          <button onClick={save} disabled={saving} className="btn-primary text-sm">
            {saving ? 'Wird gespeichert …' : 'Speichern'}
          </button>
        </div>
      </header>

      <section className="card space-y-4">
        <h2 className="font-display text-xl text-white">Restaurant-Daten</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name" value={settings.restaurant_name} onChange={v => setSettings({ ...settings, restaurant_name: v })} />
          <Field label="Telefon" value={settings.contact_phone || ''} onChange={v => setSettings({ ...settings, contact_phone: v })} />
          <Field label="E-Mail" value={settings.contact_email || ''} onChange={v => setSettings({ ...settings, contact_email: v })} />
          <Field label="Google Maps URL" value={settings.maps_url || ''} onChange={v => setSettings({ ...settings, maps_url: v })} />
          <div className="sm:col-span-2">
            <label className="label">Adresse</label>
            <input value={settings.address || ''} onChange={e => setSettings({ ...settings, address: e.target.value })} className="input" />
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-xl text-white">Öffnungszeiten</h2>
        <div className="space-y-2">
          {DAYS.map(({ wd, label }) => {
            const oh = settings.opening_hours[wd];
            return (
              <div key={wd} className="flex items-center gap-3 flex-wrap">
                <span className="w-28 text-gray-300 text-sm">{label}</span>
                <label className="inline-flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={oh !== null}
                    onChange={e => setDayHours(wd, e.target.checked ? ['17:00', '22:00'] : null)}
                    className="accent-gold"
                  />
                  Geöffnet
                </label>
                {oh && (
                  <>
                    <input
                      type="time"
                      value={oh[0]}
                      onChange={e => setDayHours(wd, [e.target.value, oh[1]])}
                      className="input max-w-[120px]"
                    />
                    <span className="text-gray-500">bis</span>
                    <input
                      type="time"
                      value={oh[1]}
                      onChange={e => setDayHours(wd, [oh[0], e.target.value])}
                      className="input max-w-[120px]"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-xl text-white">Reservierungs-Regeln</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumField label="Standard-Dauer (Min.)" value={settings.duration_short_min} onChange={v => setSettings({ ...settings, duration_short_min: v })} />
          <NumField label="Lange Dauer ab Schwelle (Min.)" value={settings.duration_long_min} onChange={v => setSettings({ ...settings, duration_long_min: v })} />
          <NumField label="Schwelle für lange Dauer (Personen)" value={settings.party_size_threshold} onChange={v => setSettings({ ...settings, party_size_threshold: v })} />
          <NumField label="Max. Personen online" value={settings.max_party_size_online} onChange={v => setSettings({ ...settings, max_party_size_online: v })} />
          <NumField label="Mind. Vorlaufzeit (Min.)" value={settings.min_lead_minutes} onChange={v => setSettings({ ...settings, min_lead_minutes: v })} />
          <NumField label="Stornofrist (Std. vor Reservierung)" value={settings.cancellation_deadline_hours} onChange={v => setSettings({ ...settings, cancellation_deadline_hours: v })} />
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-xl text-white">Feiertage / geschlossene Tage</h2>
        <p className="text-xs text-gray-500">An diesen Tagen werden keine Reservierungen angenommen.</p>
        <AddHolidayForm onAdd={addHoliday} />
        {holidays.length === 0 ? (
          <p className="text-sm text-gray-500">Keine Feiertage eingetragen.</p>
        ) : (
          <ul className="space-y-1.5">
            {holidays.map(h => (
              <li key={h.id} className="flex justify-between items-center bg-ink-700/50 rounded px-3 py-2 text-sm">
                <span>
                  <span className="text-white font-medium">{fmtDateShort(h.date)}</span>{' '}
                  <span className="text-gray-400">— {h.name}</span>
                </span>
                <button
                  onClick={async () => {
                    await api.adminDeleteHoliday(h.id);
                    load();
                  }}
                  className="text-xs text-wine-light hover:underline"
                >
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} className="input" />
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="input" />
    </div>
  );
}

function AddHolidayForm({ onAdd }: { onAdd: (date: string, name: string) => void }) {
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (date && name) {
          onAdd(date, name);
          setDate('');
          setName('');
        }
      }}
      className="flex gap-2 flex-wrap items-end"
    >
      <div className="flex-1 min-w-[150px]">
        <label className="label">Datum</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" required />
      </div>
      <div className="flex-1 min-w-[200px]">
        <label className="label">Bezeichnung</label>
        <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="z.B. Weihnachten" required />
      </div>
      <button type="submit" className="btn-secondary text-sm">+ Hinzufügen</button>
    </form>
  );
}
