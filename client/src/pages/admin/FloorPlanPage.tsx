import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import type { AdminTable } from '../../types';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 520;
const GRID = 10;

export function FloorPlanPage() {
  const [tables, setTables] = useState<AdminTable[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: number;
    mode: 'move' | 'resize';
    offsetX: number;
    offsetY: number;
    startW: number;
    startH: number;
  } | null>(null);

  async function load() {
    const list = await api.adminGetTables();
    setTables(list.filter(t => t.active));
  }

  useEffect(() => {
    load();
  }, []);

  function snap(v: number): number {
    return Math.round(v / GRID) * GRID;
  }

  function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }

  function startMove(e: React.MouseEvent, t: AdminTable) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(t.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      id: t.id,
      mode: 'move',
      offsetX: e.clientX - rect.left - t.pos_x,
      offsetY: e.clientY - rect.top - t.pos_y,
      startW: t.width,
      startH: t.height,
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', endDrag);
  }

  function startResize(e: React.MouseEvent, t: AdminTable) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(t.id);
    dragRef.current = {
      id: t.id,
      mode: 'resize',
      offsetX: e.clientX,
      offsetY: e.clientY,
      startW: t.width,
      startH: t.height,
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', endDrag);
  }

  function onMove(e: MouseEvent) {
    const drag = dragRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;

    setTables(prev =>
      prev.map(t => {
        if (t.id !== drag.id) return t;
        if (drag.mode === 'move') {
          const x = snap(clamp(e.clientX - rect.left - drag.offsetX, 0, CANVAS_WIDTH - t.width));
          const y = snap(clamp(e.clientY - rect.top - drag.offsetY, 0, CANVAS_HEIGHT - t.height));
          return { ...t, pos_x: x, pos_y: y };
        }
        const dw = e.clientX - drag.offsetX;
        const dh = e.clientY - drag.offsetY;
        const w = snap(clamp(drag.startW + dw, 50, CANVAS_WIDTH - t.pos_x));
        const h = snap(clamp(drag.startH + dh, 50, CANVAS_HEIGHT - t.pos_y));
        return { ...t, width: w, height: h };
      }),
    );
    setDirty(true);
  }

  function endDrag() {
    dragRef.current = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', endDrag);
  }

  async function save() {
    setSaving(true);
    try {
      await api.adminBulkPositions(
        tables.map(t => ({ id: t.id, pos_x: t.pos_x, pos_y: t.pos_y, width: t.width, height: t.height })),
      );
      setDirty(false);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  const selected = tables.find(t => t.id === selectedId) || null;

  async function updateSelected(patch: Partial<AdminTable>) {
    if (!selected) return;
    setTables(prev => prev.map(t => (t.id === selected.id ? { ...t, ...patch } : t)));
    await api.adminUpdateTable(selected.id, patch);
  }

  return (
    <div className="space-y-4" onClick={() => setSelectedId(null)}>
      <header className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl text-white">Floor Plan – Editor</h1>
          <p className="text-gray-400 text-sm mt-1">
            Tische platzieren, Größe anpassen. Klick auf Tisch zum Bearbeiten.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && !dirty && (
            <span className="text-xs text-gray-500">Gespeichert {savedAt.toLocaleTimeString('de-DE')}</span>
          )}
          <button onClick={save} disabled={!dirty || saving} className="btn-primary text-sm">
            {saving ? 'Wird gespeichert …' : 'Layout speichern'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div
          ref={canvasRef}
          onClick={e => e.stopPropagation()}
          className="relative bg-ink-900 border border-ink-500 rounded-lg overflow-hidden mx-auto"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            backgroundImage:
              'linear-gradient(rgba(64,64,64,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(64,64,64,0.15) 1px, transparent 1px)',
            backgroundSize: `${GRID * 4}px ${GRID * 4}px`,
            cursor: dragRef.current ? 'grabbing' : 'default',
          }}
        >
          {tables.map(t => {
            const isSelected = t.id === selectedId;
            return (
              <div
                key={t.id}
                onMouseDown={e => startMove(e, t)}
                className={`absolute select-none cursor-move flex flex-col items-center justify-center text-xs font-semibold border-2 transition-shadow ${
                  isSelected
                    ? 'border-gold bg-gold/20 text-gold shadow-lg shadow-gold/20'
                    : 'border-ink-500 bg-ink-700/60 text-gray-300 hover:border-gold/60'
                }`}
                style={{
                  left: t.pos_x,
                  top: t.pos_y,
                  width: t.width,
                  height: t.height,
                  borderRadius: t.shape === 'circle' ? '50%' : '8px',
                }}
              >
                <div className="font-display text-sm">{t.name}</div>
                <div className="text-[10px] opacity-70">{t.capacity} P.</div>
                <div
                  onMouseDown={e => startResize(e, t)}
                  className={`absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize ${isSelected ? 'bg-gold' : 'bg-gray-600'}`}
                  style={{ borderTopLeftRadius: '4px' }}
                />
              </div>
            );
          })}
          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              Noch keine Tische – Tische über „Tische" anlegen.
            </div>
          )}
        </div>

        <aside className="card space-y-4 self-start">
          <h3 className="font-display text-lg text-white">
            {selected ? `Tisch ${selected.name}` : 'Auswahl'}
          </h3>
          {!selected ? (
            <p className="text-sm text-gray-500">Klicken Sie einen Tisch im Plan an.</p>
          ) : (
            <>
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  value={selected.name}
                  onChange={e => updateSelected({ name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Plätze</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="input"
                  value={selected.capacity}
                  onChange={e => updateSelected({ capacity: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Form</label>
                <div className="flex gap-2">
                  {(['rect', 'circle'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => updateSelected({ shape: s })}
                      className={`flex-1 py-2 rounded-lg border text-sm ${
                        selected.shape === s
                          ? 'bg-gold text-ink-900 border-gold'
                          : 'bg-ink-700 text-gray-300 border-ink-500'
                      }`}
                    >
                      {s === 'rect' ? 'Eckig' : 'Rund'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Breite</label>
                  <input
                    type="number"
                    className="input"
                    value={selected.width}
                    onChange={e => updateSelected({ width: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Höhe</label>
                  <input
                    type="number"
                    className="input"
                    value={selected.height}
                    onChange={e => updateSelected({ height: Number(e.target.value) })}
                  />
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      <p className="text-xs text-gray-500">
        Tipp: Tische lassen sich frei platzieren. Die Ecke unten rechts ändert die Größe.
        Speichern Sie das Layout, damit das Personal die neue Anordnung im Dashboard sieht.
      </p>
    </div>
  );
}
