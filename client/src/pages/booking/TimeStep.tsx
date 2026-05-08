import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { fmtDate } from '../../lib/format';
import type { DayAvailability } from '../../types';
import type { BookingState } from './BookingWizard';

interface Props {
  state: BookingState;
  onChange: (s: Partial<BookingState>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TimeStep({ state, onChange, onBack, onNext }: Props) {
  const [data, setData] = useState<DayAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getAvailability(state.date, state.partySize)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [state.date, state.partySize]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-display text-white">Verfügbare Zeiten</h2>
        <p className="text-sm text-gray-400 mt-1">
          {fmtDate(state.date)} · {state.partySize} {state.partySize === 1 ? 'Person' : 'Personen'}
        </p>
      </header>

      {loading && (
        <div className="text-center py-12 text-gray-500">
          <div className="inline-block w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <div className="mt-3 text-sm">Verfügbarkeit wird geprüft …</div>
        </div>
      )}

      {error && (
        <div className="card border-wine/40 bg-wine/10 text-center">
          <p className="text-wine-light">{error}</p>
        </div>
      )}

      {!loading && !error && data?.closed && (
        <div className="card text-center py-10">
          <div className="text-4xl mb-3">🏖️</div>
          <p className="text-gray-300 font-medium">{data.closed_reason}</p>
          <p className="text-gray-500 text-sm mt-2">Bitte wählen Sie ein anderes Datum.</p>
        </div>
      )}

      {!loading && !error && data && !data.closed && (
        <>
          {data.slots.filter(s => s.available).length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-gray-300 font-medium">Keine freien Zeiten an diesem Tag.</p>
              <p className="text-gray-500 text-sm mt-2">Bitte wählen Sie ein anderes Datum.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {data.slots.map(slot => (
                <button
                  key={slot.start}
                  disabled={!slot.available}
                  onClick={() => onChange({ time: slot.time })}
                  className={`py-3 rounded-lg font-semibold text-sm transition-all border ${
                    state.time === slot.time
                      ? 'bg-gold text-ink-900 border-gold shadow-lg shadow-gold/20'
                      : slot.available
                        ? 'bg-ink-800 text-white border-ink-500 hover:border-gold/50'
                        : 'bg-ink-800/40 text-gray-600 border-ink-500/40 cursor-not-allowed line-through'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex gap-3 pt-4">
        <button onClick={onBack} className="btn-ghost">
          ← Zurück
        </button>
        <button onClick={onNext} className="btn-primary flex-1 sm:flex-none" disabled={!state.time}>
          Weiter →
        </button>
      </div>
    </div>
  );
}
