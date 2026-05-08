import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { AdminTable, TableGroup } from '../../types';

export function TablesPage() {
  const [tables, setTables] = useState<AdminTable[]>([]);
  const [groups, setGroups] = useState<TableGroup[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [editGroup, setEditGroup] = useState<TableGroup | null>(null);

  async function load() {
    const [t, g] = await Promise.all([api.adminGetTables(), api.adminGetGroups()]);
    setTables(t);
    setGroups(g);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl text-white">Tische & Kombinationen</h1>
        <p className="text-gray-400 text-sm mt-1">Tische verwalten und festlegen, welche zusammenlegbar sind.</p>
      </header>

      <section>
        <div className="flex justify-between items-end mb-3">
          <h2 className="font-display text-xl text-white">Tische</h2>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">+ Tisch hinzufügen</button>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-500 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-3">Name</th>
                <th className="text-left py-3 px-3">Plätze</th>
                <th className="text-left py-3 px-3">Form</th>
                <th className="text-left py-3 px-3">Position</th>
                <th className="text-left py-3 px-3">Aktiv</th>
                <th className="text-right py-3 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {tables.map(t => (
                <tr key={t.id} className="border-b border-ink-500/50">
                  <td className="py-3 px-3 text-white font-medium">{t.name}</td>
                  <td className="py-3 px-3 text-gray-300">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={t.capacity}
                      onChange={async e => {
                        await api.adminUpdateTable(t.id, { capacity: Number(e.target.value) });
                        load();
                      }}
                      className="bg-ink-700 border border-ink-500 rounded px-2 py-1 w-20 text-sm focus:outline-none focus:border-gold"
                    />
                  </td>
                  <td className="py-3 px-3 text-gray-300">
                    <select
                      value={t.shape}
                      onChange={async e => {
                        await api.adminUpdateTable(t.id, { shape: e.target.value as 'rect' | 'circle' });
                        load();
                      }}
                      className="bg-ink-700 border border-ink-500 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
                    >
                      <option value="rect">Eckig</option>
                      <option value="circle">Rund</option>
                    </select>
                  </td>
                  <td className="py-3 px-3 text-gray-500 text-xs">
                    {t.pos_x},{t.pos_y} · {t.width}×{t.height}
                  </td>
                  <td className="py-3 px-3">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.active}
                        onChange={async e => {
                          await api.adminUpdateTable(t.id, { active: e.target.checked });
                          load();
                        }}
                        className="accent-gold"
                      />
                    </label>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={async () => {
                        if (!confirm(`Tisch "${t.name}" wirklich löschen?`)) return;
                        try {
                          await api.adminDeleteTable(t.id);
                          load();
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="text-xs text-wine-light hover:underline"
                    >
                      Entfernen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-end mb-3">
          <div>
            <h2 className="font-display text-xl text-white">Tisch-Kombinationen</h2>
            <p className="text-xs text-gray-500 mt-1">
              Wenn keine Einzeltisch passt, sucht das System unter diesen Kombinationen.
            </p>
          </div>
          <button onClick={() => setShowCreateGroup(true)} className="btn-secondary text-sm">+ Kombination</button>
        </div>
        {groups.length === 0 ? (
          <div className="card text-gray-500 text-sm text-center py-6">Noch keine Kombinationen angelegt.</div>
        ) : (
          <ul className="space-y-2">
            {groups.map(g => (
              <li key={g.id} className="card flex justify-between items-center">
                <div>
                  <div className="text-white font-medium">{g.name}</div>
                  <div className="text-xs text-gray-400">
                    {g.table_ids.map(id => tables.find(t => t.id === id)?.name || `#${id}`).join(' + ')} · für {g.combined_capacity} Personen
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditGroup(g)}
                    className="text-xs text-gold hover:underline"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Kombination löschen?')) {
                        await api.adminDeleteGroup(g.id);
                        load();
                      }
                    }}
                    className="text-xs text-wine-light hover:underline"
                  >
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showCreate && (
        <CreateTableModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {showCreateGroup && (
        <GroupModal
          tables={tables.filter(t => t.active)}
          onClose={() => setShowCreateGroup(false)}
          onSaved={() => {
            setShowCreateGroup(false);
            load();
          }}
        />
      )}
      {editGroup && (
        <GroupModal
          tables={tables.filter(t => t.active)}
          existing={editGroup}
          onClose={() => setEditGroup(null)}
          onSaved={() => {
            setEditGroup(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateTableModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [shape, setShape] = useState<'rect' | 'circle'>('rect');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.adminCreateTable({ name, capacity, shape });
      onCreated();
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="card max-w-md w-full space-y-4">
        <h2 className="font-display text-2xl text-white">Neuer Tisch</h2>
        <div>
          <label className="label">Name</label>
          <input required value={name} onChange={e => setName(e.target.value)} className="input" placeholder="z.B. Tisch 11" />
        </div>
        <div>
          <label className="label">Plätze</label>
          <input type="number" required min={1} max={50} value={capacity} onChange={e => setCapacity(Number(e.target.value))} className="input" />
        </div>
        <div>
          <label className="label">Form</label>
          <div className="flex gap-2">
            {(['rect', 'circle'] as const).map(s => (
              <button
                type="button"
                key={s}
                onClick={() => setShape(s)}
                className={`flex-1 py-2 rounded-lg border ${shape === s ? 'bg-gold text-ink-900 border-gold' : 'bg-ink-700 text-gray-300 border-ink-500'}`}
              >
                {s === 'rect' ? 'Eckig' : 'Rund'}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-wine-light text-sm">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Abbrechen</button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Wird angelegt …' : 'Anlegen'}
          </button>
        </div>
      </form>
    </div>
  );
}

function GroupModal({
  tables,
  existing,
  onClose,
  onSaved,
}: {
  tables: AdminTable[];
  existing?: TableGroup;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [capacity, setCapacity] = useState(existing?.combined_capacity ?? 8);
  const [tableIds, setTableIds] = useState<number[]>(existing?.table_ids ?? []);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggle(id: number) {
    setTableIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tableIds.length < 2) {
      setError('Mindestens 2 Tische auswählen.');
      return;
    }
    setSubmitting(true);
    try {
      if (existing) {
        await api.adminUpdateGroup(existing.id, { name, table_ids: tableIds, combined_capacity: capacity });
      } else {
        await api.adminCreateGroup({ name, table_ids: tableIds, combined_capacity: capacity });
      }
      onSaved();
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="card max-w-md w-full space-y-4">
        <h2 className="font-display text-2xl text-white">{existing ? 'Kombination bearbeiten' : 'Neue Kombination'}</h2>
        <div>
          <label className="label">Name</label>
          <input required value={name} onChange={e => setName(e.target.value)} className="input" placeholder="z.B. Tisch 5+6 zusammen" />
        </div>
        <div>
          <label className="label">Tische auswählen</label>
          <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto p-2 bg-ink-700/50 rounded-lg scrollbar-thin">
            {tables.map(t => (
              <button
                type="button"
                key={t.id}
                onClick={() => toggle(t.id)}
                className={`text-xs py-1.5 rounded border ${
                  tableIds.includes(t.id)
                    ? 'bg-gold text-ink-900 border-gold'
                    : 'bg-ink-800 text-gray-300 border-ink-500'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Gesamtkapazität (zusammen)</label>
          <input type="number" required min={1} max={100} value={capacity} onChange={e => setCapacity(Number(e.target.value))} className="input" />
        </div>
        {error && <p className="text-wine-light text-sm">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Abbrechen</button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Wird gespeichert …' : existing ? 'Speichern' : 'Anlegen'}
          </button>
        </div>
      </form>
    </div>
  );
}
