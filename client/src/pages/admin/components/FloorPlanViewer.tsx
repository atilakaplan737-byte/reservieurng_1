import type { TableWithStatus } from '../../../types';
import { fmtTime } from '../../../lib/format';

interface Props {
  tables: TableWithStatus[];
  onTableClick: (table: TableWithStatus) => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 520;

const STATUS_STYLES: Record<TableWithStatus['status'], string> = {
  free: 'bg-emerald-500/15 border-emerald-400 text-emerald-200 hover:bg-emerald-500/25',
  reserved: 'bg-amber-500/15 border-amber-400 text-amber-200 hover:bg-amber-500/25',
  occupied: 'bg-wine/30 border-wine-light text-white hover:bg-wine/50 animate-pulse-soft',
};

export function FloorPlanViewer({ tables, onTableClick }: Props) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div
        className="relative bg-ink-900 border border-ink-500 rounded-lg mx-auto"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundImage:
            'linear-gradient(rgba(64,64,64,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(64,64,64,0.15) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      >
        {tables.map(t => (
          <button
            key={t.id}
            onClick={() => onTableClick(t)}
            className={`absolute border-2 cursor-pointer text-xs font-semibold transition-all overflow-hidden flex flex-col items-center justify-center ${STATUS_STYLES[t.status]}`}
            style={{
              left: t.pos_x,
              top: t.pos_y,
              width: t.width,
              height: t.height,
              borderRadius: t.shape === 'circle' ? '50%' : '8px',
            }}
            title={describe(t)}
          >
            <div className="font-display text-sm leading-tight">{t.name}</div>
            <div className="text-[10px] opacity-80">{t.capacity} P.</div>
            {t.current_reservation && (
              <div className="text-[9px] mt-0.5 leading-tight px-1">
                bis {fmtTime(t.current_reservation.end_time)}
              </div>
            )}
            {!t.current_reservation && t.next_reservation && (
              <div className="text-[9px] mt-0.5 leading-tight px-1">
                ab {fmtTime(t.next_reservation.start_time)}
              </div>
            )}
          </button>
        ))}
        {tables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
            Noch keine Tische angelegt – Floor Plan im Editor öffnen.
          </div>
        )}
      </div>
    </div>
  );
}

function describe(t: TableWithStatus): string {
  if (t.status === 'occupied' && t.current_reservation) {
    return `${t.name}: belegt von ${t.current_reservation.customer_name} (${t.current_reservation.party_size} Pers.) bis ${fmtTime(t.current_reservation.end_time)}`;
  }
  if (t.status === 'reserved' && t.next_reservation) {
    return `${t.name}: reserviert ab ${fmtTime(t.next_reservation.start_time)} für ${t.next_reservation.customer_name} (${t.next_reservation.party_size} Pers.)`;
  }
  return `${t.name}: frei (${t.capacity} Plätze)`;
}
