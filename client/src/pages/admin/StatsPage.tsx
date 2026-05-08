import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { fmtDateShort } from '../../lib/format';

interface Stats {
  days: number;
  total: { total: number; guests: number };
  by_day: { date: string; count: number; guests: number }[];
  by_hour: { hour: number; count: number }[];
  by_status: { status: string; count: number }[];
}

export function StatsPage() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.adminGetStats(days).then(s => {
      setStats(s);
      setLoading(false);
    });
  }, [days]);

  if (loading || !stats) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="inline-block w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  const maxDay = Math.max(1, ...stats.by_day.map(d => d.count));
  const maxHour = Math.max(1, ...stats.by_hour.map(h => h.count));
  const statusLabels: Record<string, string> = {
    confirmed: 'Bestätigt',
    completed: 'Abgeschlossen',
    cancelled: 'Storniert',
    no_show: 'No-show',
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl text-white">Statistik</h1>
          <p className="text-gray-400 text-sm mt-1">Auslastung und Trends</p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="input max-w-[160px]">
          <option value={7}>Letzte 7 Tage</option>
          <option value={30}>Letzte 30 Tage</option>
          <option value={90}>Letzte 90 Tage</option>
          <option value={365}>Letztes Jahr</option>
        </select>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Reservierungen" value={stats.total.total} />
        {stats.by_status.map(s => (
          <StatCard key={s.status} label={statusLabels[s.status] || s.status} value={s.count} />
        ))}
      </div>

      <section className="card">
        <h2 className="font-display text-lg text-white mb-4">Reservierungen nach Tag</h2>
        {stats.by_day.length === 0 ? (
          <p className="text-gray-500 text-sm">Keine Daten.</p>
        ) : (
          <div className="space-y-1.5">
            {stats.by_day.map(d => (
              <div key={d.date} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-gray-400 text-xs">{fmtDateShort(d.date)}</span>
                <div className="flex-1 bg-ink-700 rounded h-6 overflow-hidden">
                  <div
                    className="h-full bg-gold/70 flex items-center px-2 text-xs text-ink-900 font-semibold transition-all"
                    style={{ width: `${(d.count / maxDay) * 100}%` }}
                  >
                    {d.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="font-display text-lg text-white mb-4">Beliebteste Uhrzeiten</h2>
        {stats.by_hour.length === 0 ? (
          <p className="text-gray-500 text-sm">Keine Daten.</p>
        ) : (
          <div className="grid grid-cols-12 gap-1 sm:gap-2 items-end h-40">
            {Array.from({ length: 24 }, (_, h) => {
              const data = stats.by_hour.find(x => x.hour === h);
              const count = data?.count || 0;
              const pct = (count / maxHour) * 100;
              return (
                <div key={h} className="flex flex-col items-center justify-end h-full" title={`${h}:00 — ${count} Res.`}>
                  <div
                    className={`w-full rounded-t ${count > 0 ? 'bg-gold/70' : 'bg-ink-700'}`}
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                  <div className="text-[9px] text-gray-500 mt-1">{h}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card text-center">
      <div className="text-3xl font-display text-gold">{value}</div>
      <div className="text-xs uppercase tracking-wider text-gray-500 mt-1">{label}</div>
    </div>
  );
}
