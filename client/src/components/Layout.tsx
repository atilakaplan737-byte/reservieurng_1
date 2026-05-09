import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import type { RestaurantInfo } from '../types';

interface Props {
  children: React.ReactNode;
}

export function Layout({ children }: Props) {
  const location = useLocation();
  const [info, setInfo] = useState<RestaurantInfo | null>(null);

  useEffect(() => {
    api.getInfo().then(i => {
      setInfo(i);
      if (i?.restaurant_name) document.title = `${i.restaurant_name} – Tisch reservieren`;
    }).catch(() => {});
  }, []);

  const isAdmin = location.pathname.startsWith('/admin');
  const dayLabels = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-ink-500 bg-ink-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="font-display text-xl sm:text-2xl font-bold text-gold tracking-[0.15em]">
              {info?.restaurant_name?.toUpperCase() || 'RESTAURANT'}
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            {!isAdmin ? (
              <>
                {info?.contact_phone && (
                  <a
                    href={`tel:${info.contact_phone}`}
                    className="hidden sm:flex items-center gap-1 text-sm text-gray-400 hover:text-gold transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 5a2 2 0 0 1 2-2h2.5a2 2 0 0 1 2 1.5l.7 2.8a2 2 0 0 1-1.1 2.4l-1.6.8a14 14 0 0 0 6 6l.8-1.6a2 2 0 0 1 2.4-1.1l2.8.7A2 2 0 0 1 21 16.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 5z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {info.contact_phone}
                  </a>
                )}
                <Link to="/" className="btn-secondary text-xs sm:text-sm py-2 px-4">
                  Tisch reservieren
                </Link>
              </>
            ) : (
              <Link to="/" className="text-sm text-gray-400 hover:text-gold transition">
                ← Zur Buchung
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-ink-500 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-gray-500">
          <div>
            <div className="font-display text-gold text-lg mb-2 tracking-wider">
              {info?.restaurant_name}
            </div>
            <p className="leading-relaxed">{info?.address}</p>
            {info?.maps_url && (
              <a href={info.maps_url} target="_blank" rel="noreferrer" className="text-gold text-xs hover:underline mt-1 inline-block">
                Auf Karte ansehen →
              </a>
            )}
          </div>
          <div>
            <div className="text-gray-300 mb-3 font-medium">Kontakt</div>
            {info?.contact_phone && (
              <a href={`tel:${info.contact_phone}`} className="block hover:text-gold transition">
                {info.contact_phone}
              </a>
            )}
            {info?.contact_email && (
              <a href={`mailto:${info.contact_email}`} className="block hover:text-gold transition">
                {info.contact_email}
              </a>
            )}
          </div>
          <div>
            <div className="text-gray-300 mb-3 font-medium">Öffnungszeiten</div>
            {info && (
              <ul className="space-y-1">
                {[1, 2, 3, 4, 5, 6, 0].map(wd => {
                  const oh = info.opening_hours[String(wd)];
                  return (
                    <li key={wd} className="flex justify-between gap-4">
                      <span className="text-gray-500">{dayLabels[wd]}</span>
                      <span className={oh ? 'text-gray-300' : 'text-gray-600'}>
                        {oh ? `${oh[0]} – ${oh[1]}` : 'Geschlossen'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        <div className="border-t border-ink-500 py-4 text-center text-xs text-gray-600">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span>© {new Date().getFullYear()} {info?.restaurant_name}</span>
            <span className="text-ink-500">·</span>
            <Link to="/impressum" className="hover:text-gold">Impressum</Link>
            <span className="text-ink-500">·</span>
            <Link to="/datenschutz" className="hover:text-gold">Datenschutz</Link>
            <span className="text-ink-500">·</span>
            <Link to="/admin" className="hover:text-gold">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
