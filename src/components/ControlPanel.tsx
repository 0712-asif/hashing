import { useState } from 'react';
import { useHashStore } from '../store/hashStore';
import type { Strategy } from '../types/hashing';
import TestPanel from './TestPanel';

const STRATEGIES: { value: Strategy; label: string; badge: string }[] = [
  { value: 'chaining',  label: 'Chaining',        badge: 'O(1+α)' },
  { value: 'linear',    label: 'Linear Probe',     badge: '(h+i) mod m' },
  { value: 'quadratic', label: 'Quadratic Probe',  badge: 'h+c₁i+c₂i²' },
  { value: 'double',    label: 'Double Hashing',   badge: 'h₁+i·h₂' },
];

export default function ControlPanel() {
  const { table, insert, search, deleteKey, resize, setStrategy, clearTable } =
    useHashStore();

  const [keyInput,  setKeyInput]  = useState('');
  const [speed,     setSpeed]     = useState(1);
  const [feedback,  setFeedback]  = useState<{ msg: string; ok: boolean } | null>(null);

  const showFeedback = (msg: string, ok: boolean) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleInsert = () => {
    const k = parseInt(keyInput);
    if (isNaN(k)) { showFeedback('Enter a valid integer key', false); return; }
    const res = insert(k);
    showFeedback(
      res.success
        ? `✓ Key ${k} → slot ${res.finalSlot} (${res.probes} probe${res.probes !== 1 ? 's' : ''})`
        : '✗ Table full!',
      res.success
    );
    setKeyInput('');
  };

  const handleSearch = () => {
    const k = parseInt(keyInput);
    if (isNaN(k)) { showFeedback('Enter a valid integer key', false); return; }
    const res = search(k);
    showFeedback(
      res.found
        ? `✓ Found key ${k} (${res.probes} probe${res.probes !== 1 ? 's' : ''})`
        : `✗ Key ${k} not found`,
      res.found
    );
  };

  const handleDelete = () => {
    const k = parseInt(keyInput);
    if (isNaN(k)) { showFeedback('Enter a valid integer key', false); return; }
    const res = deleteKey(k);
    showFeedback(
      res.success ? `✓ Key ${k} deleted` : `✗ Key ${k} not found`,
      res.success
    );
    setKeyInput('');
  };

  const handleResize = (newM: number) => {
    resize(newM);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(table, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'hash_table_state.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const alpha = table.m > 0 ? (table.n / table.m).toFixed(3) : '0';

  return (
    <aside
      className="glass flex flex-col gap-3 p-4 shrink-0 w-full overflow-y-auto"
      role="complementary"
      aria-label="Hash table controls"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-glow-cyan" style={{ color: 'var(--color-neon-cyan)', fontFamily: 'var(--font-mono)' }}>
          CONTROL PANEL
        </h2>
        <span className="badge badge-cyan">{table.strategy}</span>
      </div>

      {/* ── Feedback ── */}
      {feedback && (
        <div
          className={`glass-card p-2 text-xs font-mono ${feedback.ok ? 'text-green-400' : 'text-red-400'}`}
          role="alert"
          style={{ fontFamily: 'var(--font-mono)', borderColor: feedback.ok ? 'rgba(0,255,136,0.3)' : 'rgba(255,51,102,0.3)' }}
        >
          {feedback.msg}
        </div>
      )}

      {/* ── Key Input + Actions ── */}
      <div className="glass-card p-3 flex flex-col gap-2">
        <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Key (integer)
        </label>
        <input
          className="neon-input"
          type="number"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleInsert()}
          placeholder="e.g. 42"
          aria-label="Key input"
        />
        <div className="grid grid-cols-3 gap-1 mt-1">
          <button className="btn-primary text-xs px-1" onClick={handleInsert} id="btn-insert">Insert</button>
          <button className="btn-search text-xs px-1"  onClick={handleSearch} id="btn-search">Search</button>
          <button className="btn-danger text-xs px-1"  onClick={handleDelete} id="btn-delete">Delete</button>
        </div>
      </div>

      {/* ── Scenarios ── */}
      <TestPanel />

      {/* ── Strategy Selector ── */}
      <div className="glass-card p-3 flex flex-col gap-2">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Collision Strategy</span>
        <div className="flex flex-col gap-1">
          {STRATEGIES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStrategy(s.value)}
              className="flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-all duration-200"
              style={{
                background: table.strategy === s.value
                  ? 'rgba(0,245,255,0.12)'
                  : 'transparent',
                border: `1px solid ${table.strategy === s.value
                  ? 'rgba(0,245,255,0.45)'
                  : 'rgba(0,245,255,0.08)'}`,
                color: table.strategy === s.value
                  ? 'var(--color-neon-cyan)'
                  : 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
              id={`strategy-${s.value}`}
              aria-pressed={table.strategy === s.value}
            >
              <span>{s.label}</span>
              <code className="text-xs opacity-60">{s.badge}</code>
            </button>
          ))}
        </div>
      </div>

      {/* ── Table Size ── */}
      <div className="glass-card p-3 flex flex-col gap-2">
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--color-text-muted)' }}>Table Size (m)</span>
          <span style={{ color: 'var(--color-neon-cyan)', fontFamily: 'var(--font-mono)' }}>{table.m}</span>
        </div>
        <input
          type="range" min={4} max={64} step={1}
          value={table.m}
          onChange={(e) => handleResize(parseInt(e.target.value))}
          aria-label="Table size"
          id="slider-m"
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span>4</span><span>64</span>
        </div>
      </div>

      {/* ── Speed ── */}
      <div className="glass-card p-3 flex flex-col gap-2">
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--color-text-muted)' }}>Animation Speed</span>
          <span style={{ color: 'var(--color-neon-amber)', fontFamily: 'var(--font-mono)' }}>{speed}×</span>
        </div>
        <input
          type="range" min={0.25} max={4} step={0.25}
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          aria-label="Animation speed"
          id="slider-speed"
        />
      </div>

      {/* ── Stats Mini ── */}
      <div className="glass-card p-3 grid grid-cols-2 gap-2">
        {[
          { label: 'n (keys)',   val: table.n,                 col: 'var(--color-neon-cyan)' },
          { label: 'm (slots)',  val: table.m,                 col: 'var(--color-neon-cyan)' },
          { label: 'α (load)',   val: alpha,                   col: parseFloat(alpha) > 0.7 ? 'var(--color-neon-red)' : parseFloat(alpha) > 0.4 ? 'var(--color-neon-amber)' : 'var(--color-neon-green)' },
          { label: 'collisions', val: table.collisionCount,    col: 'var(--color-neon-red)' },
        ].map(({ label, val, col }) => (
          <div key={label} className="flex flex-col">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
            <span className="text-lg font-bold" style={{ color: col, fontFamily: 'var(--font-mono)' }}>{val}</span>
          </div>
        ))}
      </div>

      {/* ── Utility Buttons ── */}
      <div className="flex flex-col gap-2">
        <button className="btn-ghost w-full" onClick={clearTable} id="btn-clear">
          ⟳ Clear Table
        </button>
        <button className="btn-ghost w-full" onClick={handleExport} id="btn-export">
          ↓ Export JSON
        </button>
      </div>
    </aside>
  );
}
