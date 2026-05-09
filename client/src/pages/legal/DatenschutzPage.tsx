import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { RestaurantInfo } from '../../types';

export function DatenschutzPage() {
  const [info, setInfo] = useState<RestaurantInfo | null>(null);

  useEffect(() => {
    api.getInfo().then(setInfo).catch(() => {});
  }, []);

  if (!info) return null;

  const contact = info.contact_email || info.legal_owner_email || info.contact_phone || info.restaurant_name;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-gray-300">
      <h1 className="font-display text-3xl text-gold mb-8">Datenschutzerklärung</h1>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-white font-medium mb-2">1. Verantwortlicher</h2>
          <p className="text-gray-400">{info.restaurant_name}</p>
          {info.legal_owner_name && <p className="text-gray-400">Inhaber: {info.legal_owner_name}</p>}
          {info.address && <p className="text-gray-400">{info.address}</p>}
          {info.contact_email && <p className="text-gray-400">E-Mail: {info.contact_email}</p>}
          {info.contact_phone && <p className="text-gray-400">Telefon: {info.contact_phone}</p>}
        </div>

        <div>
          <h2 className="text-white font-medium mb-2">2. Welche Daten wir erheben</h2>
          <p className="text-gray-400 mb-2">Bei einer Online-Tischreservierung verarbeiten wir folgende Daten:</p>
          <ul className="list-disc list-inside text-gray-400 space-y-1 ml-2">
            <li>Vor- und Nachname</li>
            <li>E-Mail-Adresse</li>
            <li>Telefonnummer</li>
            <li>Reservierungsdatum, Uhrzeit und Personenanzahl</li>
            <li>Optional: persönliche Anmerkungen (z.B. Allergien, Anlass)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-white font-medium mb-2">3. Zweck und Rechtsgrundlage</h2>
          <p className="text-gray-400">
            Die Verarbeitung erfolgt zur Durchführung der Tischreservierung und zur Übermittlung der
            Reservierungsbestätigung. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
            sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer reibungslosen Tischorganisation).
          </p>
        </div>

        <div>
          <h2 className="text-white font-medium mb-2">4. Speicherdauer</h2>
          <p className="text-gray-400">
            Reservierungsdaten werden bis zur Erledigung der Reservierung sowie für einen angemessenen Zeitraum
            darüber hinaus zur Bearbeitung etwaiger Rückfragen gespeichert. Eine darüber hinausgehende Speicherung
            erfolgt nur, soweit gesetzliche Aufbewahrungspflichten dies erfordern.
          </p>
        </div>

        <div>
          <h2 className="text-white font-medium mb-2">5. Empfänger / Auftragsverarbeiter</h2>
          <p className="text-gray-400 mb-2">Zur Bereitstellung des Reservierungsdienstes nutzen wir folgende Dienstleister:</p>
          <ul className="list-disc list-inside text-gray-400 space-y-1 ml-2">
            <li>Hosting & Webserver: Render Services Inc. (USA) – Auftragsverarbeitung gemäß Art. 28 DSGVO</li>
            <li>Datenbank: Supabase Inc. / Neon, Inc. (EU-Region) – Auftragsverarbeitung gemäß Art. 28 DSGVO</li>
            <li>E-Mail-Versand: Google Ireland Ltd. (Gmail SMTP) zur Zustellung von Reservierungsbestätigungen</li>
          </ul>
        </div>

        <div>
          <h2 className="text-white font-medium mb-2">6. Cookies & Tracking</h2>
          <p className="text-gray-400">
            Diese Webseite verwendet ausschließlich technisch notwendige Cookies (Session-Cookie für den Admin-Bereich).
            Es findet kein Tracking, keine Analytik und keine Weitergabe an Werbenetzwerke statt.
          </p>
        </div>

        <div>
          <h2 className="text-white font-medium mb-2">7. Ihre Rechte</h2>
          <p className="text-gray-400 mb-2">Sie haben jederzeit das Recht auf:</p>
          <ul className="list-disc list-inside text-gray-400 space-y-1 ml-2">
            <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)</li>
            <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
            <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
            <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
          </ul>
          <p className="text-gray-400 mt-2">
            Zur Ausübung Ihrer Rechte wenden Sie sich bitte an: {contact}
          </p>
        </div>

        <div>
          <h2 className="text-white font-medium mb-2">8. Stornierung</h2>
          <p className="text-gray-400">
            Jede Reservierungsbestätigung enthält einen persönlichen Stornolink. Über diesen können Sie Ihre
            Reservierung jederzeit selbst stornieren – Ihre Daten werden in diesem Fall als „storniert" markiert
            und gemäß Speicherdauer (Pkt. 4) entfernt.
          </p>
        </div>
      </section>
    </div>
  );
}
