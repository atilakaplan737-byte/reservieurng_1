import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { RestaurantInfo } from '../../types';

export function ImpressumPage() {
  const [info, setInfo] = useState<RestaurantInfo | null>(null);

  useEffect(() => {
    api.getInfo().then(setInfo).catch(() => {});
  }, []);

  if (!info) return null;

  const addressLines = (info.address || '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-gray-300">
      <h1 className="font-display text-3xl text-gold mb-8">Impressum</h1>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-white font-medium mb-2">Angaben gemäß § 5 TMG</h2>
          <p className="text-gray-400">{info.restaurant_name}</p>
          {info.legal_owner_name && <p className="text-gray-400">Inhaber: {info.legal_owner_name}</p>}
          {addressLines.map((line, i) => (
            <p key={i} className="text-gray-400">{line}</p>
          ))}
        </div>

        <div>
          <h2 className="text-white font-medium mb-2">Kontakt</h2>
          {info.contact_phone && (
            <p className="text-gray-400">
              Telefon: <a href={`tel:${info.contact_phone}`} className="hover:text-gold">{info.contact_phone}</a>
            </p>
          )}
          {info.contact_email && (
            <p className="text-gray-400">
              E-Mail: <a href={`mailto:${info.contact_email}`} className="hover:text-gold">{info.contact_email}</a>
            </p>
          )}
        </div>

        {info.legal_tax_id && (
          <div>
            <h2 className="text-white font-medium mb-2">Umsatzsteuer-ID</h2>
            <p className="text-gray-400">{info.legal_tax_id}</p>
          </div>
        )}

        <div>
          <h2 className="text-white font-medium mb-2">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <p className="text-gray-400">{info.legal_owner_name || info.restaurant_name}</p>
          {addressLines.map((line, i) => (
            <p key={i} className="text-gray-400">{line}</p>
          ))}
        </div>

        <div>
          <h2 className="text-white font-medium mb-2">Haftung für Inhalte</h2>
          <p className="text-gray-400">
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen
            Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet,
            übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf
            eine rechtswidrige Tätigkeit hinweisen.
          </p>
        </div>

        <div>
          <h2 className="text-white font-medium mb-2">Haftung für Links</h2>
          <p className="text-gray-400">
            Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben.
            Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
            Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
          </p>
        </div>

        <div>
          <h2 className="text-white font-medium mb-2">Urheberrecht</h2>
          <p className="text-gray-400">
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
            Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
            Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
          </p>
        </div>
      </section>
    </div>
  );
}
