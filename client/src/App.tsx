import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { BookingWizard } from './pages/booking/BookingWizard';
import { CancelPage } from './pages/cancel/CancelPage';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminApp } from './pages/admin/AdminApp';
import { ImpressumPage } from './pages/legal/ImpressumPage';
import { DatenschutzPage } from './pages/legal/DatenschutzPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><BookingWizard /></Layout>} />
      <Route path="/storno/:token" element={<Layout><CancelPage /></Layout>} />
      <Route path="/impressum" element={<Layout><ImpressumPage /></Layout>} />
      <Route path="/datenschutz" element={<Layout><DatenschutzPage /></Layout>} />
      <Route path="/admin/login" element={<Layout><AdminLogin /></Layout>} />
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
