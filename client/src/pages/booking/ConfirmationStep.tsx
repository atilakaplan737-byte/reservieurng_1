import { Link } from 'react-router-dom';
import { fmtDate, fmtTime } from '../../lib/format';
import type { ReservationCreated, RestaurantInfo } from '../../types';
import type { BookingState } from './BookingWizard';

interface Props {
  result: ReservationCreated;
  state: BookingState;
  info: RestaurantInfo | null;
}

export function ConfirmationStep({ result, state, info }: Props) {
  return (
    <div className="text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h1 className="font-display text-3xl sm:text-4xl text-white mb-3">Vielen Dank!</h1>
      <p className="text-gray-400 mb-10 max-w-md mx-auto">
        Ihre Reservierung wurde bestätigt. Eine Bestätigungs-E-Mail mit allen Details
        ist an <span className="text-gold">{state.customerEmail}</span> unterwegs.
      </p>

      <div className="card max-w-md mx-auto text-left space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Datum</span>
          <span className="text-white text-sm font-medium">{fmtDate(state.date)}</span>
        </div>
        <div className="flex justify-between border-t border-ink-500 pt-3">
          <span className="text-gray-400 text-sm">Uhrzeit</span>
          <span className="text-gold text-sm font-semibold">
            {fmtTime(result.start_time)} – {fmtTime(result.end_time)}
          </span>
        </div>
        <div className="flex justify-between border-t border-ink-500 pt-3">
          <span className="text-gray-400 text-sm">Personen</span>
          <span className="text-white text-sm font-medium">{state.partySize}</span>
        </div>
        <div className="flex justify-between border-t border-ink-500 pt-3">
          <span className="text-gray-400 text-sm">Tisch</span>
          <span className="text-gold text-sm font-semibold">
            {result.table_names.join(' + ')}
          </span>
        </div>
        {result.combined && (
          <p className="text-xs text-gray-500 italic pt-2 border-t border-ink-500">
            Mehrere Tische werden für Sie zusammengestellt.
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link to={`/storno/${result.cancellation_token}`} className="btn-secondary">
          Reservierung verwalten
        </Link>
        {info?.contact_phone && (
          <a href={`tel:${info.contact_phone}`} className="btn-ghost">
            Restaurant anrufen: {info.contact_phone}
          </a>
        )}
      </div>
    </div>
  );
}
