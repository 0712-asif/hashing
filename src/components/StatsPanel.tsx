import { useMemo } from 'react';
import { useHashStore } from '../store/hashStore';

// ─── Load Factor Gauge ────────────────────────────────────────────────────────
function LoadGauge({ alpha }: { alpha: number }) {
  const R = 44;
  const circ = 2 * Math.PI * R;
  const color =
    alpha > 0.7 ? '#ff3366' :
    alpha > 0.4 ? '#ffaa00' : '#00f5ff';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="110" height="60" viewBox="0 0 110 60" aria-label={`Load factor ${alpha.toFixed(2)}`}>
        {/* Track */}
        <path
          d="M 10 55 A 45 45 0 0 1 100 55"
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d="M 10 55 A 45 45 0 0 1 100 55"
          fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circ / 2}`}
          strokeDashoffset={`${(circ / 2) * (1 - Math.min(alpha, 1))}`}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease', filter: `drop-shadow(0 0 6px ${color})` }}
        />
        {/* Needle */}
        <text x="55" y="52" textAnchor="middle" fontSize="14" fontFamily="monospace" fontWeight="bold" fill={color}>
          {alpha.toFixed(2)}
        </text>
        <text x="55" y="62" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.4)">α</text>
      </svg>
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Load Factor</span>
    </div>
  );
}

// ─── Probe Histogram ──────────────────────────────────────────────────────────
function ProbeHistogram({ histogram }: { histogram: number[] }) {
  const max = Math.max(...histogram, 1);
  const visible = histogram.slice(0, 10);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Probe Length Distribution
      </span>
      <div className="flex items-end gap-0.5 h-14" role="img" aria-label="Probe length histogram">
        {visible.map((count, i) => {
          const pct = (count / max) * 100;
          const col = i === 0 ? '#00f5ff' : i < 4 ? '#ffaa00' : '#ff3366';
          return (
            <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
              <div
                className="w-full rounded-t-sm transition-all duration-500"
                style={{
                  height: `${pct}%`,
                  minHeight: count > 0 ? 2 : 0,
                  background: col,
                  boxShadow: count > 0 ? `0 0 6px ${col}` : 'none',
                }}
                title={`${i} probes: ${count} ops`}
              />
              <span className="text-xs leading-none" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>{i}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Slot Grid Heatmap ────────────────────────────────────────────────────────
function SlotHeatmap() {
  const slots = useHashStore((s) => s.table.slots);
  const m     = useHashStore((s) => s.table.m);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Slot Heatmap
      </span>
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${Math.min(m, 8)}, 1fr)` }}
        role="list"
        aria-label="Slot heatmap"
      >
        {slots.map((slot, i) => {
          const heat   = Math.min((slot.probeCount || 0) / 5, 1);
          const isOcc  = slot.state === 'occupied';
          const isDel  = slot.state === 'deleted';
          const chains = slot.chain?.length ?? 0;
          const bg =
            isDel  ? 'rgba(58,58,74,0.8)' :
            !isOcc ? 'rgba(13,34,51,0.6)' :
            `rgba(${Math.round(255 * heat)},${Math.round(245 * (1-heat))},${Math.round(255 * (1-heat))},0.8)`;

          return (
            <div
              key={i}
              role="listitem"
              aria-label={`Slot ${i}: ${slot.state}${chains > 1 ? `, ${chains} items` : ''}`}
              tabIndex={0}
              className="flex items-center justify-center rounded text-xs font-mono transition-all duration-300"
              style={{
                width: '100%', aspectRatio: '1',
                background: bg,
                border: isOcc ? '1px solid rgba(0,245,255,0.3)' : '1px solid rgba(0,245,255,0.06)',
                fontSize: 9,
                color: isOcc ? '#e2eaf4' : 'rgba(255,255,255,0.2)',
                cursor: 'default',
              }}
              title={`Slot ${i} | ${slot.state} | key: ${slot.key ?? '–'} | probes: ${slot.probeCount}`}
            >
              {isDel ? '✕' : isOcc ? (slot.key !== null ? slot.key % 100 : '·') : '·'}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stats Panel ──────────────────────────────────────────────────────────────
export default function StatsPanel() {
  const table = useHashStore((s) => s.table);
  const alpha = table.m > 0 ? table.n / table.m : 0;

  const collisionProb = useMemo(() => {
    return (1 - Math.exp(-alpha)).toFixed(4);
  }, [alpha]);

  const expectedChain = alpha.toFixed(3);

  return (
    <div
      className="glass flex flex-col gap-4 p-4 shrink-0 w-full overflow-y-auto"
      role="complementary"
      aria-label="Live statistics"
    >
      <h2
        className="text-sm font-semibold"
        style={{ color: 'var(--color-neon-cyan)', fontFamily: 'var(--font-mono)' }}
      >
        LIVE STATS
      </h2>

      {/* Gauge */}
      <LoadGauge alpha={alpha} />

      {/* Key metrics */}
      <div className="glass-card p-3 flex flex-col gap-2">
        {[
          { label: 'E[chain]',     val: expectedChain,   tip: 'Expected chain length = α' },
          { label: 'P(collision)', val: collisionProb,   tip: '≈ 1−e^(−α) uniform hashing' },
          { label: 'Total probes', val: table.totalProbes, tip: 'Cumulative probes across all ops' },
          { label: 'Collisions',   val: table.collisionCount, tip: 'Total collision events' },
        ].map(({ label, val, tip }) => (
          <div key={label} className="flex justify-between items-center">
            <span
              className="text-xs tooltip"
              style={{ color: 'var(--color-text-muted)' }}
              data-tip={tip}
            >
              {label}
            </span>
            <span
              className="text-sm font-bold font-mono"
              style={{ color: 'var(--color-neon-cyan)', fontFamily: 'var(--font-mono)' }}
            >
              {val}
            </span>
          </div>
        ))}
      </div>

      {/* Histogram */}
      <div className="glass-card p-3">
        <ProbeHistogram histogram={table.probeLengthHistogram} />
      </div>

      {/* Heatmap */}
      <div className="glass-card p-3">
        <SlotHeatmap />
      </div>

      {/* Load indicator */}
      <div className="glass-card p-2">
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
          <span>Fill</span>
          <span>{table.n}/{table.m}</span>
        </div>
        <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((alpha) * 100, 100)}%`,
              background: alpha > 0.7 ? '#ff3366' : alpha > 0.4 ? '#ffaa00' : '#00f5ff',
              boxShadow: `0 0 8px ${alpha > 0.7 ? '#ff3366' : alpha > 0.4 ? '#ffaa00' : '#00f5ff'}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
