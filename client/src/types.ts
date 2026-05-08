export interface RestaurantInfo {
  restaurant_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  maps_url: string | null;
  opening_hours: { [weekday: string]: [string, string] | null };
  duration_short_min: number;
  duration_long_min: number;
  party_size_threshold: number;
  max_party_size_online: number;
  cancellation_deadline_hours: number;
}

export interface Slot {
  time: string;
  start: string;
  end: string;
  available: boolean;
}

export interface DayAvailability {
  date: string;
  closed: boolean;
  closed_reason?: string;
  slots: Slot[];
}

export interface ReservationCreated {
  id: number;
  cancellation_token: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  table_names: string[];
  combined: boolean;
}

export interface ReservationDetails {
  id: number;
  customer_name: string;
  customer_email: string | null;
  party_size: number;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  table_names: string[];
}

export interface AdminTable {
  id: number;
  name: string;
  capacity: number;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  shape: 'rect' | 'circle';
  active: boolean;
  sort_order: number;
}

export interface TableWithStatus extends AdminTable {
  status: 'free' | 'reserved' | 'occupied';
  current_reservation: {
    id: number;
    customer_name: string;
    party_size: number;
    end_time: string;
    walk_in: boolean;
  } | null;
  next_reservation: {
    id: number;
    customer_name: string;
    party_size: number;
    start_time: string;
  } | null;
}

export interface AdminReservation {
  id: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  party_size: number;
  start_time: string;
  end_time: string;
  table_ids: number[];
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  walk_in: boolean;
  notes: string | null;
  cancellation_token: string;
  created_at: string;
}

export interface TableGroup {
  id: number;
  name: string;
  table_ids: number[];
  combined_capacity: number;
  active: boolean;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
}

export interface Settings extends RestaurantInfo {
  min_lead_minutes: number;
}
