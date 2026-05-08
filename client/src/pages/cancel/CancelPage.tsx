import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { fmtDate, fmtTime } from '../../lib/format';
import type { ReservationDetails } from '../../types';

const CONFIRM_WORD = 'stornieren';

export function CancelPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<ReservationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .getReservationByToken(token)
      .then(setDetails)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!cancelled) return;
    const t = setTimeout(() => navigate('/', { replace: true }), 2500);
    return () => clearTimeout(t);
  }, [cancelled, navigate]);

  async function handleCancel() {
    if (!token) return;
    if (confirmInput.trim().toLowerCase() !== CONFIRM_WORD) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await api.cancelReservation(token);
      setCancelled(true);
    } catch (e: any) {
      setCancelError(e.message);
      setCancelling(false);
    }
  }

  return (
    <div className="hero-gradient">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {loading && (
          <div className="text-center py-12 text-gray-500">
            <div className="inline-block w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="card border-wine/40 bg-wine/10 text-center">
            <h2 className="text-xl font-display text-white mb-2">Reservierung nicht gefunden</h2>
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        )}

        {details && cancelled && (
          <div className="card text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-wine/10 border border-wine/40 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-wine-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="font-display text-2xl text-white mb-2">Reservierung storniert</h2>
            <p className="text-gray-400 mb-4">
              Schade, dass es nicht klappt. Sie werden gleich zur Reservierungs-Seite weitergeleitet …
            </p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="btn-primary"
            >
              Neue Reservierung anlegen
            </button>
          </div>
        )}

        {details && !cancelled && (
          <div className="space-y-6 animate-fade-in">
            <header>
              <h1 className="font-display text-3xl text-white">Ihre Reservierung</h1>
              <p className="text-gray-400 text-sm mt-1">
                Status: <span className={details.status === 'confirmed' ? 'text-gold' : 'text-gray-500'}>
                  {details.status === 'confirmed' ? 'Bestätigt' : 'Storniert'}
                </span>
              </p>
            </header>

            <div className="card space-y-3">
              <Row label="Name" value={details.customer_name} />
              <Row label="Datum" value={fmtDate(details.start_time)} divider />
              <Row
                label="Uhrzeit"
                value={`${fmtTime(details.start_time)} – ${fmtTime(details.end_time)}`}
                accent
                divider
              />
              <Row label="Personen" value={String(details.party_size)} divider />
              <Row label="Tisch" value={details.table_names.join(' + ') || '–'} accent divider />
            </div>

            {cancelError && (
              <div className="card border-wine/40 bg-wine/10">
                <p className="text-wine-light text-sm">{cancelError}</p>
              </div>
            )}

            {details.status === 'confirmed' && !showConfirm && (
              <button onClick={() => setShowConfirm(true)} className="btn-danger w-full">
                Reservierung stornieren
              </button>
            )}

            {details.status === 'confirmed' && showConfirm && (
              <div className="card border-wine/40 bg-wine/10 space-y-3">
                <p className="text-wine-light text-sm">
                  Zum Bestätigen tippen Sie bitte das Wort <span className="font-bold">stornieren</span> in das Feld ein.
                  Die Reservierung wird unwiderruflich gelöscht.
                </p>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={e => setConfirmInput(e.target.value)}
                  placeholder="stornieren"
                  autoFocus
                  className="input"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowConfirm(false);
                      setConfirmInput('');
                      setCancelError(null);
                    }}
                    className="btn-ghost flex-1"
                    disabled={cancelling}
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleCancel}
                    className="btn-danger flex-1"
                    disabled={cancelling || confirmInput.trim().toLowerCase() !== CONFIRM_WORD}
                  >
                    {cancelling ? 'Wird storniert …' : 'Endgültig stornieren'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, accent, divider }: { label: string; value: string; accent?: boolean; divider?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${divider ? 'border-t border-ink-500 pt-3' : ''}`}>
      <span className="text-gray-400">{label}</span>
      <span className={accent ? 'text-gold font-semibold' : 'text-white font-medium'}>{value}</span>
    </div>
  );
}
