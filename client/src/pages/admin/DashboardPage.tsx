import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { fmtTime, todayIso } from '../../lib/format';
import type { AdminReservation, TableWithStatus } from '../../types';
import { FloorPlanViewer } from './components/FloorPlanViewer';
import { SeatTableModal } from './components/SeatTableModal';

export function DashboardPage() {
  const [tables, setTables] = useState<TableWithStatus[]>([]);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [date, setDate] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [seatModal, setSeatModal] = useState<TableWithStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [statusRes, resRes] = await Promise.all([
        api.adminGetTableStatus(),
        api.adminGetReservations(date),
      ]);
      setTables(statusRes.tables);
      setReservations(resRes.reservations);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [date]);

  async function handleFreeTable(table: TableWithStatus) {
    if (!confirm(`Tisch "${table.name}" jetzt freigeben?`)) return;
    await api.adminFreeTable(table.id);
    load();
  }

  const stats = {
    free: tables.filter(t => t.status === 'free').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Live-Übersicht & Reservierungen für {date}</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="input max-w-[200px]"
        />
      </header>

      {error && <div className="card border-wine/40 bg-wine/10 text-wine-light text-sm">{error}</div>}

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Frei" value={stats.free} color="text-emerald-400" />
        <StatCard label="Reserviert" value={stats.reserved} color="text-amber-400" />
        <StatCard label="Belegt" value={stats.occupied} color="text-wine-light" />
      </div>

      <section className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-xl text-white">Floor Plan – Live</h2>
          <p className="text-xs text-gray-500">Klick auf Tisch für Aktionen · automatisch alle 30s aktualisiert</p>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="inline-block w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : (
          <FloorPlanViewer
            tables={tables}
            onTableClick={t => {
              if (t.status === 'free') {
                setSeatModal(t);
              } else if (t.status === 'occupied') {
                handleFreeTable(t);
              } else {
                alert(
                  `${t.name} ist reserviert ab ${
                    t.next_reservation ? fmtTime(t.next_reservation.start_time) : ''
                  } für ${t.next_reservation?.customer_name} (${t.next_reservation?.party_size} Pers.)`,
                );
              }
            }}
          />
        )}
        <Legend />
      </section>

      <section>
        <div className="flex justify-between items-end mb-3">
          <h2 className="font-display text-xl text-white">Reservierungen am {date}</h2>
          <span className="text-xs text-gray-500">{reservations.length} insgesamt</span>
        </div>
        {reservations.length === 0 ? (
          <div className="card text-center py-8 text-gray-500 text-sm">Keine Reservierungen</div>
        ) : (
          <ul className="space-y-2">
            {reservations.map(r => (
              <ReservationRow key={r.id} r={r} tables={tables} onChange={load} />
            ))}
          </ul>
        )}
      </section>

      {seatModal && (
        <SeatTableModal
          table={seatModal}
          onClose={() => setSeatModal(null)}
          onSeated={() => {
            setSeatModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card text-center">
      <div className={`text-3xl font-display ${color}`}>{value}</div>
      <div className="text-xs uppercase tracking-wider text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-gray-500 mt-4 pt-4 border-t border-ink-500">
      <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500/70 border border-emerald-400" /> Frei</span>
      <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-500/70 border border-amber-400" /> Reserviert</span>
      <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-wine border border-wine-light" /> Belegt</span>
    </div>
  );
}

function ReservationRow({
  r,
  tables,
  onChange,
}: {
  r: AdminReservation;
  tables: TableWithStatus[];
  onChange: () => void;
}) {
  const tableNames = r.table_ids.map(id => tables.find(t => t.id === id)?.name || `#${id}`).join(' + ');
  const statusColors: Record<string, string> = {
    confirmed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    cancelled: 'bg-wine/20 text-wine-light border-wine/40',
    completed: 'bg-ink-700 text-gray-400 border-ink-500',
    no_show: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  };
  const statusLabel: Record<string, string> = {
    confirmed: 'Bestätigt',
    cancelled: 'Storniert',
    completed: 'Abgeschlossen',
    no_show: 'No-show',
  };

  async function setStatus(status: string) {
    await api.adminUpdateReservation(r.id, { status });
    onChange();
  }

  async function remove() {
    if (!confirm('Reservierung wirklich löschen?')) return;
    await api.adminDeleteReservation(r.id);
    onChange();
  }

  return (
    <li className="card flex items-center gap-4 flex-wrap">
      <div className="flex-shrink-0 text-center min-w-[60px]">
        <div className="text-2xl font-display text-gold">{fmtTime(r.start_time)}</div>
        <div className="text-[10px] text-gray-500">bis {fmtTime(r.end_time)}</div>
      </div>
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-medium">{r.customer_name}</span>
          {r.walk_in && <span className="chip bg-amber-500/10 text-amber-300 border border-amber-500/30">Walk-in</span>}
          <span className={`chip border ${statusColors[r.status]}`}>{statusLabel[r.status]}</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {r.party_size} Pers. · {tableNames || '–'}
          {r.customer_phone && ` · ${r.customer_phone}`}
        </div>
        {r.notes && <div className="text-xs text-gray-500 italic mt-1">„{r.notes}"</div>}
      </div>
      <div className="flex gap-1">
        {r.status === 'confirmed' && (
          <>
            <button onClick={() => setStatus('completed')} className="btn-ghost text-xs">Abschließen</button>
            <button onClick={() => setStatus('no_show')} className="btn-ghost text-xs">No-show</button>
            <button onClick={() => setStatus('cancelled')} className="btn-ghost text-xs">Stornieren</button>
          </>
        )}
        <button onClick={remove} className="btn-ghost text-xs text-wine-light">Löschen</button>
      </div>
    </li>
  );
}
