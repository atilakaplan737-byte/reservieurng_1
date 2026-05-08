import { useState } from 'react';
import { api } from '../../../lib/api';
import type { TableWithStatus } from '../../../types';

interface Props {
  table: TableWithStatus;
  onClose: () => void;
  onSeated: () => void;
}

export function SeatTableModal({ table, onClose, onSeated }: Props) {
  const [partySize, setPartySize] = useState(Math.min(2, table.capacity));
  const [duration, setDuration] = useState(90);
  const [name, setName] = useState('Walk-in');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.adminSeatTable(table.id, {
        party_size: partySize,
        duration_minutes: duration,
        customer_name: name || 'Walk-in',
        notes: notes || undefined,
      });
      onSeated();
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        className="card max-w-md w-full space-y-4"
      >
        <header>
          <h2 className="font-display text-2xl text-white">{table.name} belegen</h2>
          <p className="text-sm text-gray-400 mt-1">Walk-in oder Tisch manuell besetzen.</p>
        </header>

        <div>
          <label className="label">Personen</label>
          <input
            type="number"
            min={1}
            max={50}
            value={partySize}
            onChange={e => setPartySize(Number(e.target.value))}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Dauer (Minuten)</label>
          <input
            type="number"
            min={15}
            step={15}
            max={360}
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Name (optional)</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Notiz</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} className="input" />
        </div>

        {error && <p className="text-wine-light text-sm">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Abbrechen
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={submitting}>
            {submitting ? 'Wird gespeichert …' : 'Belegen'}
          </button>
        </div>
      </form>
    </div>
  );
}
