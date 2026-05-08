import type {
  AdminReservation,
  AdminTable,
  DayAvailability,
  Holiday,
  ReservationCreated,
  ReservationDetails,
  RestaurantInfo,
  Settings,
  TableGroup,
  TableWithStatus,
} from '../types';

const BASE = '/api';

async function http<T>(path: string, init?: RequestInit, withAuth = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (withAuth) {
    const token = localStorage.getItem('admin_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = `Fehler ${res.status}`;
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch {}
    if (res.status === 401 && withAuth) {
      localStorage.removeItem('admin_token');
      if (location.pathname.startsWith('/admin') && !location.pathname.startsWith('/admin/login')) {
        location.href = '/admin/login';
      }
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export const api = {
  // ─── Customer ────────────────────────────────────────────────
  getInfo: () => http<RestaurantInfo>('/info'),

  getAvailability: (date: string, partySize: number) =>
    http<DayAvailability>(`/availability?date=${date}&partySize=${partySize}`),

  createReservation: (data: {
    date: string;
    time: string;
    party_size: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    notes?: string;
  }) =>
    http<ReservationCreated>('/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getReservationByToken: (token: string) =>
    http<ReservationDetails>(`/reservations/by-token/${token}`),

  cancelReservation: (token: string) =>
    http<{ ok: true }>(`/reservations/by-token/${token}`, { method: 'DELETE' }),

  // ─── Admin ────────────────────────────────────────────────
  adminLogin: (password: string) =>
    http<{ token: string; expires_at: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  adminLogout: () => http<{ ok: true }>('/admin/logout', { method: 'POST' }, true),
  adminCheckSession: () => http<{ ok: true }>('/admin/session', undefined, true),

  // Reservierungen
  adminGetReservations: (date: string) =>
    http<{ date: string; reservations: AdminReservation[] }>(
      `/admin/reservations?date=${date}`,
      undefined,
      true,
    ),

  adminCreateReservation: (data: any) =>
    http<AdminReservation>('/admin/reservations', { method: 'POST', body: JSON.stringify(data) }, true),

  adminUpdateReservation: (id: number, data: any) =>
    http<AdminReservation>(`/admin/reservations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, true),

  adminDeleteReservation: (id: number) =>
    http<{ ok: true }>(`/admin/reservations/${id}`, { method: 'DELETE' }, true),

  // Tische
  adminGetTableStatus: () =>
    http<{ tables: TableWithStatus[]; now: string }>('/admin/tables/status', undefined, true),

  adminGetTables: () => http<AdminTable[]>('/admin/tables', undefined, true),

  adminCreateTable: (data: Partial<AdminTable>) =>
    http<AdminTable>('/admin/tables', { method: 'POST', body: JSON.stringify(data) }, true),

  adminUpdateTable: (id: number, data: Partial<AdminTable>) =>
    http<AdminTable>(`/admin/tables/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, true),

  adminDeleteTable: (id: number) =>
    http<{ ok: true }>(`/admin/tables/${id}`, { method: 'DELETE' }, true),

  adminBulkPositions: (updates: { id: number; pos_x: number; pos_y: number; width?: number; height?: number }[]) =>
    http<{ ok: true; updated: number }>(
      '/admin/tables/bulk-positions',
      { method: 'POST', body: JSON.stringify({ updates }) },
      true,
    ),

  adminSeatTable: (id: number, data: { party_size: number; duration_minutes: number; customer_name?: string; notes?: string }) =>
    http<AdminReservation>(`/admin/tables/${id}/seat`, { method: 'POST', body: JSON.stringify(data) }, true),

  adminFreeTable: (id: number) =>
    http<{ updated: number; now: string }>(`/admin/tables/${id}/free`, { method: 'POST' }, true),

  // Gruppen
  adminGetGroups: () => http<TableGroup[]>('/admin/groups', undefined, true),
  adminCreateGroup: (data: { name: string; table_ids: number[]; combined_capacity: number }) =>
    http<TableGroup>('/admin/groups', { method: 'POST', body: JSON.stringify(data) }, true),
  adminUpdateGroup: (id: number, data: Partial<{ name: string; table_ids: number[]; combined_capacity: number; active: boolean }>) =>
    http<TableGroup>(`/admin/groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, true),
  adminDeleteGroup: (id: number) =>
    http<{ ok: true }>(`/admin/groups/${id}`, { method: 'DELETE' }, true),

  // Feiertage
  adminGetHolidays: () => http<Holiday[]>('/admin/holidays', undefined, true),
  adminCreateHoliday: (data: { date: string; name: string }) =>
    http<Holiday>('/admin/holidays', { method: 'POST', body: JSON.stringify(data) }, true),
  adminDeleteHoliday: (id: number) =>
    http<{ ok: true }>(`/admin/holidays/${id}`, { method: 'DELETE' }, true),

  // Settings
  adminGetSettings: () => http<Settings>('/admin/settings', undefined, true),
  adminUpdateSettings: (data: Partial<Settings>) =>
    http<Settings>('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }, true),

  // Stats
  adminGetStats: (days: number) =>
    http<{
      days: number;
      total: { total: number; guests: number };
      by_day: { date: string; count: number; guests: number }[];
      by_hour: { hour: number; count: number }[];
      by_status: { status: string; count: number }[];
    }>(`/admin/stats?days=${days}`, undefined, true),
};
