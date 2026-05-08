import { useState } from 'react';
import { api } from '../../lib/api';
import { fmtDate } from '../../lib/format';
import type { ReservationCreated, RestaurantInfo } from '../../types';
import type { BookingState } from './BookingWizard';

interface Props {
  state: BookingState;
  info: RestaurantInfo | null;
  onChange: (s: Partial<BookingState>) => void;
  onBack: () => void;
  onConfirmed: (r: ReservationCreated) => void;
}

export function DetailsStep({ state, info, onChange, onBack, onConfirmed }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.time) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.createReservation({
        date: state.date,
        time: state.time,
        party_size: state.partySize,
        customer_name: state.customerName.trim(),
        customer_email: state.customerEmail.trim(),
        customer_phone: state.customerPhone.trim(),
        notes: state.notes.trim() || undefined,
      });
      onConfirmed(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <header>
        <h2 className="text-xl font-display text-white">Ihre Daten</h2>
        <p className="text-sm text-gray-400 mt-1">Damit wir Sie erreichen können.</p>
      </header>

      <div className="card space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Datum</span>
          <span className="text-white font-medium">{fmtDate(state.date)}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-ink-500 pt-3">
          <span className="text-gray-400">Uhrzeit</span>
          <span className="text-gold font-semibold">{state.time}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-ink-500 pt-3">
          <span className="text-gray-400">Personen</span>
          <span className="text-white font-medium">{state.partySize}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Name *</label>
          <input
            required
            type="text"
            value={state.customerName}
            onChange={e => onChange({ customerName: e.target.value })}
            className="input"
            placeholder="Vor- und Nachname"
          />
        </div>
        <div>
          <label className="label">E-Mail *</label>
          <input
            required
            type="email"
            value={state.customerEmail}
            onChange={e => onChange({ customerEmail: e.target.value })}
            className="input"
            placeholder="ihre@email.de"
          />
        </div>
        <div>
          <label className="label">Telefon *</label>
          <input
            required
            type="tel"
            value={state.customerPhone}
            onChange={e => onChange({ customerPhone: e.target.value })}
            className="input"
            placeholder="+49 …"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Anmerkungen (optional)</label>
          <textarea
            value={state.notes}
            onChange={e => onChange({ notes: e.target.value })}
            className="input min-h-[80px] resize-y"
            placeholder="Allergien, Geburtstag, besondere Wünsche …"
          />
        </div>
      </div>

      {error && (
        <div className="card border-wine/40 bg-wine/10">
          <p className="text-wine-light text-sm">{error}</p>
        </div>
      )}

      {info && (
        <p className="text-xs text-gray-500 leading-relaxed">
          Mit dem Klick auf „Reservierung bestätigen" akzeptieren Sie, dass wir Ihre
          Daten zur Bearbeitung Ihrer Reservierung speichern. Stornierung ist bis{' '}
          {info.cancellation_deadline_hours}h vor der Reservierung über den Link in
          der Bestätigungs-E-Mail möglich.
        </p>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn-ghost" disabled={submitting}>
          ← Zurück
        </button>
        <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={submitting}>
          {submitting ? 'Wird gesendet …' : 'Reservierung bestätigen ✓'}
        </button>
      </div>
    </form>
  );
}
