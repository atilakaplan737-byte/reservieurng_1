import { useMemo } from 'react';
import { addDays, isoDate } from '../../lib/format';
import type { RestaurantInfo } from '../../types';
import type { BookingState } from './BookingWizard';

interface Props {
  info: RestaurantInfo | null;
  state: BookingState;
  onChange: (s: Partial<BookingState>) => void;
  onNext: () => void;
}

export function DateStep({ info, state, onChange, onNext }: Props) {
  const max = info?.max_party_size_online ?? 10;
  const partyOptions = Array.from({ length: max }, (_, i) => i + 1);

  const dates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 30 }, (_, i) => addDays(today, i));
  }, []);

  const dayLabels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-display text-white mb-4">Wie viele Personen?</h2>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {partyOptions.map(n => (
            <button
              key={n}
              onClick={() => onChange({ partySize: n })}
              className={`py-3 rounded-lg font-semibold transition-all border ${
                state.partySize === n
                  ? 'bg-gold text-ink-900 border-gold shadow-lg shadow-gold/20'
                  : 'bg-ink-800 text-gray-300 border-ink-500 hover:border-gold/50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {info && state.partySize >= info.party_size_threshold && (
          <p className="text-xs text-gray-500 mt-3">
            Bei {info.party_size_threshold}+ Personen reservieren wir den Tisch für{' '}
            <span className="text-gold">{info.duration_long_min} Minuten</span>.
          </p>
        )}
        {info && state.partySize >= max && (
          <p className="text-xs text-wine-light mt-2">
            Für größere Gruppen rufen Sie uns bitte an: {info.contact_phone}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-display text-white mb-4">An welchem Tag?</h2>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
          {dates.map(d => {
            const iso = isoDate(d);
            const wd = d.getDay();
            const oh = info?.opening_hours[String(wd)];
            const isClosed = oh === null;
            const selected = state.date === iso;
            return (
              <button
                key={iso}
                disabled={isClosed}
                onClick={() => onChange({ date: iso })}
                className={`p-3 rounded-lg text-center border transition-all ${
                  selected
                    ? 'bg-gold text-ink-900 border-gold shadow-lg shadow-gold/20'
                    : isClosed
                      ? 'bg-ink-800/50 text-gray-600 border-ink-500/50 cursor-not-allowed'
                      : 'bg-ink-800 text-gray-300 border-ink-500 hover:border-gold/50'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider opacity-70">{dayLabels[wd]}</div>
                <div className="text-xl font-semibold leading-tight">{d.getDate()}</div>
                <div className="text-[10px] opacity-70">{d.toLocaleString('de-DE', { month: 'short' })}</div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="pt-4">
        <button onClick={onNext} className="btn-primary w-full sm:w-auto" disabled={state.partySize > max}>
          Weiter zur Uhrzeit →
        </button>
      </div>
    </div>
  );
}
