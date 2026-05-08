import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DashboardPage } from './DashboardPage';
import { FloorPlanPage } from './FloorPlanPage';
import { ReservationsPage } from './ReservationsPage';
import { TablesPage } from './TablesPage';
import { SettingsPage } from './SettingsPage';
import { StatsPage } from './StatsPage';

export function AdminApp() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setAuthChecked(true);
      return;
    }
    api
      .adminCheckSession()
      .then(() => setAuthenticated(true))
      .catch(() => localStorage.removeItem('admin_token'))
      .finally(() => setAuthChecked(true));
  }, [location.pathname]);

  async function logout() {
    try {
      await api.adminLogout();
    } catch {}
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  }

  if (!authChecked) {
    return (
      <div className="min-h-full flex items-center justify-center bg-ink-900">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm rounded-md transition ${
      isActive ? 'bg-gold text-ink-900 font-semibold' : 'text-gray-400 hover:text-white hover:bg-ink-700'
    }`;

  return (
    <div className="min-h-full bg-ink-900">
      <header className="border-b border-ink-500 bg-ink-900/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Link to="/admin" className="font-display text-xl text-gold tracking-wider">
            ADMIN
          </Link>
          <nav className="flex items-center gap-1 flex-wrap">
            <NavLink to="/admin" end className={navClass}>Dashboard</NavLink>
            <NavLink to="/admin/floorplan" className={navClass}>Floor Plan</NavLink>
            <NavLink to="/admin/reservations" className={navClass}>Reservierungen</NavLink>
            <NavLink to="/admin/tables" className={navClass}>Tische</NavLink>
            <NavLink to="/admin/stats" className={navClass}>Statistik</NavLink>
            <NavLink to="/admin/settings" className={navClass}>Einstellungen</NavLink>
          </nav>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-wine-light transition">
            Abmelden
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="floorplan" element={<FloorPlanPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}
