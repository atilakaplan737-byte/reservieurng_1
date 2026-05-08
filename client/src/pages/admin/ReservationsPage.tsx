import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { fmtDate, fmtTime, todayIso } from '../../lib/format';
import type { AdminReservation, AdminTable } from '../../types';

export function ReservationsPage() {
  const [date, setDate] = useState(todayIso());
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [tables, setTables] = useState<AdminTable[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [r, t] = await Promise.all([
      api.adminGetReservations(date),
      api.adminGetTables(),
    ]);
    setReservations(r.reservations);
    setTables(t);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [date]);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl text-white">Reservierungen</h1>
          <p className="text-gray-400 text-sm mt-1">{fmtDate(date)}</p>
        </div>
        <div className="flex gap-2 items-end">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input max-w-[180px]" />
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">+ Neue Reservierung</button>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-8"><div className="inline-block w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" /></div>
      ) : reservations.length === 0 ? (
        <div className="card text-center text-gray-500 py-10">Keine Reservierungen an diesem Tag.</div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-500 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-3">Zeit</th>
                <th className="text-left py-3 px-3">Name</th>
                <th className="text-left py-3 px-3">Personen</th>
                <th className="text-left py-3 px-3">Tisch</th>
                <th className="text-left py-3 px-3">Kontakt</th>
                <th className="text-left py-3 px-3">Status</th>
                <th className="text-right py-3 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(r => (
                <tr key={r.id} className="border-b border-ink-500/50 hover:bg-ink-700/50">
                  <td className="py-3 px-3 text-gold font-medium whitespace-nowrap">
                    {fmtTime(r.start_time)} – {fmtTime(r.end_time)}
                  </td>
                  <td className="py-3 px-3 text-white">
                    {r.customer_name}
                    {r.walk_in && <span className="ml-2 chip bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px]">Walk-in</span>}
                  </td>
                  <td className="py-3 px-3 text-gray-300">{r.party_size}</td>
                  <td className="py-3 px-3 text-gray-300">
                    {r.table_ids.map(id => tables.find(t => t.id === id)?.name || `#${id}`).join(' + ')}
                  </td>
                  <td className="py-3 px-3 text-gray-400 text-xs">
                    {r.customer_phone && <div>{r.customer_phone}</div>}
                    {r.customer_email && <div className="truncate max-w-[160px]">{r.customer_email}</div>}
                  </td>
                  <td className="py-3 px-3">
                    <StatusSelect r={r} onChange={load} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={async () => {
                        if (confirm('Reservierung löschen?')) {
                          await api.adminDeleteReservation(r.id);
                          load();
                        }
                      }}
                      className="text-xs text-wine-light hover:underline"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateReservationModal
          tables={tables}
          defaultDate={date}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function StatusSelect({ r, onChange }: { r: AdminReservation; onChange: () => void }) {
  return (
    <select
      value={r.status}
      onChange={async e => {
        await api.adminUpdateReservation(r.id, { status: e.target.value });
        onChange();
      }}
      className="bg-ink-700 border border-ink-500 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-gold"
    >
      <option value="confirmed">Bestätigt</option>
      <option value="completed">Abgeschlossen</option>
      <option value="no_show">No-show</option>
      <option value="cancelled">Storniert</option>
    </select>
  );
}

function CreateReservationModal({
  tables,
  defaultDate,
  onClose,
  onCreated,
}: {
  tables: AdminTable[];
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('19:00');
  const [partySize, setPartySize] = useState(2);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [tableIds, setTableIds] = useState<number[]>([]);
  const [duration, setDuration] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.adminCreateReservation({
        date,
        time,
        party_size: partySize,
        customer_name: name,
        customer_email: email || undefined,
        customer_phone: phone || undefined,
        notes: notes || undefined,
        table_ids: tableIds.length > 0 ? tableIds : undefined,
        duration_minutes: duration,
      });
      onCreated();
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  function toggleTable(id: number) {
    setTableIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="card max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin">
        <h2 className="font-display text-2xl text-white">Neue Reservierung</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Datum</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Uhrzeit</label>
            <input type="time" required value={time} onChange={e => setTime(e.target.value)} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Personen</label>
            <input type="number" min={1} max={50} required value={partySize} onChange={e => setPartySize(Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="label">Dauer (min, optional)</label>
            <input type="number" placeholder="auto" value={duration ?? ''} onChange={e => setDuration(e.target.value ? Number(e.target.value) : undefined)} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Name</label>
          <input required value={name} onChange={e => setName(e.target.value)} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">E-Mail (optional)</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Telefon (optional)</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Tische (leer = automatisch zuweisen)</label>
          <div className="grid grid-cols-3 gap-1.5 max-h-[160px] overflow-y-auto p-2 bg-ink-700/50 rounded-lg scrollbar-thin">
            {tables.filter(t => t.active).map(t => (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleTable(t.id)}
                className={`text-xs py-1.5 rounded border ${
                  tableIds.includes(t.id)
                    ? 'bg-gold text-ink-900 border-gold'
                    : 'bg-ink-800 text-gray-300 border-ink-500'
                }`}
              >
                {t.name} ({t.capacity}P)
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Notiz</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} className="input" />
        </div>

        {error && <p className="text-wine-light text-sm">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Abbrechen</button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Wird gespeichert …' : 'Reservierung erstellen'}
          </button>
        </div>
      </form>
    </div>
  );
}
