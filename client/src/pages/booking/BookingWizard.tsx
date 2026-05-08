import { useEffect, useState } from 'react';
import { ProgressBar } from '../../components/ProgressBar';
import { api } from '../../lib/api';
import type { ReservationCreated, RestaurantInfo } from '../../types';
import { DateStep } from './DateStep';
import { TimeStep } from './TimeStep';
import { DetailsStep } from './DetailsStep';
import { ConfirmationStep } from './ConfirmationStep';
import { todayIso } from '../../lib/format';

export interface BookingState {
  date: string;
  time: string | null;
  partySize: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

export function BookingWizard() {
  const [step, setStep] = useState(1);
  const [info, setInfo] = useState<RestaurantInfo | null>(null);
  const [state, setState] = useState<BookingState>({
    date: todayIso(),
    time: null,
    partySize: 2,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
  });
  const [confirmed, setConfirmed] = useState<ReservationCreated | null>(null);

  useEffect(() => {
    api.getInfo().then(setInfo).catch(() => {});
  }, []);

  const labels = ['Datum & Personen', 'Uhrzeit', 'Ihre Daten', 'Bestätigt'];

  return (
    <div className="hero-gradient">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {step === 1 && (
          <header className="text-center mb-12 animate-fade-in">
            <h1 className="font-display text-4xl sm:text-5xl text-white mb-3 tracking-tight">
              Tisch reservieren
            </h1>
            <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
              In wenigen Schritten Ihren Tisch im{' '}
              <span className="text-gold">{info?.restaurant_name}</span> sichern.
            </p>
          </header>
        )}

        {step < 4 && <ProgressBar step={step} total={4} labels={labels} />}

        <div className="animate-slide-up">
          {step === 1 && (
            <DateStep
              info={info}
              state={state}
              onChange={s => setState({ ...state, ...s })}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <TimeStep
              state={state}
              onChange={s => setState({ ...state, ...s })}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <DetailsStep
              state={state}
              info={info}
              onChange={s => setState({ ...state, ...s })}
              onBack={() => setStep(2)}
              onConfirmed={r => {
                setConfirmed(r);
                setStep(4);
              }}
            />
          )}
          {step === 4 && confirmed && (
            <ConfirmationStep result={confirmed} state={state} info={info} />
          )}
        </div>
      </div>
    </div>
  );
}
