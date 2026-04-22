import { useState } from 'react';
import { useHashStore } from '../store/hashStore';
import type { FormulaId } from '../types/hashing';

interface FormulaCard {
  id: FormulaId;
  title: string;
  formula: string;
  explain: string;
  tag: string;
  tagColor: string;
}

const FORMULAS: FormulaCard[] = [
  {
    id: 'hash_fn',
    title: 'Hash Function',
    formula: 'h(k) = k mod m',
    explain: 'Maps key k to a slot index in [0, m−1]. Simple, fast, uniform distribution for random keys.',
    tag: 'Core',
    tagColor: 'badge-cyan',
  },
  {
    id: 'load_factor',
    title: 'Load Factor',
    formula: 'α = n / m',
    explain: 'n = keys inserted, m = table size. Controls performance. Keep α < 0.7 for open addressing.',
    tag: 'Metric',
    tagColor: 'badge-amber',
  },
  {
    id: 'chain_length',
    title: 'Expected Chain Length',
    formula: 'E[chain] = α',
    explain: 'With chaining and uniform hashing, expected chain length equals the load factor. Average search = O(1 + α).',
    tag: 'Chaining',
    tagColor: 'badge-cyan',
  },
  {
    id: 'collision_prob',
    title: 'Collision Probability',
    formula: 'P(collision) ≈ 1 − e^(−α)',
    explain: 'Probability that any slot experiences a collision under uniform hashing. Rises sharply as α → 1.',
    tag: 'Probability',
    tagColor: 'badge-amber',
  },
  {
    id: 'linear_probe',
    title: 'Linear Probing',
    formula: '(h(k) + i) mod m',
    explain: 'Probe sequence steps linearly. Simple & cache-friendly but causes PRIMARY CLUSTERING — long runs of occupied slots degrade performance.',
    tag: 'Open Addr.',
    tagColor: 'badge-red',
  },
  {
    id: 'quad_probe',
    title: 'Quadratic Probing',
    formula: '(h(k) + c₁·i + c₂·i²) mod m',
    explain: 'Spreads probes quadratically. Reduces primary clustering but SECONDARY CLUSTERING can occur when two keys share the same h(k).',
    tag: 'Open Addr.',
    tagColor: 'badge-red',
  },
  {
    id: 'double_hash',
    title: 'Double Hashing',
    formula: '(h₁(k) + i·h₂(k)) mod m',
    explain: 'Uses a second hash h₂(k) = p − (k mod p) where p is a prime < m. Ensures no clustering. Best distribution for open addressing.',
    tag: 'Open Addr.',
    tagColor: 'badge-green',
  },
];

// ─── Trade-off cards ──────────────────────────────────────────────────────────
const TRADEOFFS = [
  {
    strategy: 'Chaining',
    pros: ['O(1+α) avg search', 'No table overflow', 'Simple delete'],
    cons: ['Extra pointer memory', 'Cache unfriendly (linked list)'],
    color: '#00f5ff',
  },
  {
    strategy: 'Open Addressing',
    pros: ['Cache-friendly (contiguous)', 'No extra allocations'],
    cons: ['Degrades at α > 0.7', 'Delete requires tombstones'],
    color: '#ffaa00',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function FormulaPanel() {
  const activeId = useHashStore((s) => s.activeFormulaId);
  const [tab, setTab] = useState<'formulas' | 'tradeoffs'>('formulas');

  return (
    <div
      className="glass flex flex-col gap-3 p-4 shrink-0 w-full overflow-y-auto"
      role="complementary"
      aria-label="Formula reference panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-neon-purple)', fontFamily: 'var(--font-mono)' }}>
          THEORY
        </h2>
        <div className="flex gap-1">
          {(['formulas', 'tradeoffs'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="text-xs px-2 py-1 rounded"
              style={{
                background: tab === t ? 'rgba(191,95,255,0.2)' : 'transparent',
                border: `1px solid ${tab === t ? 'rgba(191,95,255,0.5)' : 'rgba(191,95,255,0.1)'}`,
                color: tab === t ? '#bf5fff' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
            >
              {t === 'formulas' ? '∑ Formulas' : '⚖ Trade-offs'}
            </button>
          ))}
        </div>
      </div>

      {/* Formulas Tab */}
      {tab === 'formulas' && (
        <div className="flex flex-col gap-2">
          {FORMULAS.map((f) => {
            const isActive = activeId === f.id;
            return (
              <div
                key={f.id}
                className={`glass-card p-3 flex flex-col gap-1.5 transition-all duration-300 ${isActive ? 'formula-active' : ''}`}
                style={{
                  borderColor: isActive ? 'rgba(0,245,255,0.5)' : 'rgba(0,245,255,0.06)',
                  background: isActive ? 'rgba(0,245,255,0.07)' : 'rgba(17,29,46,0.9)',
                }}
                role="article"
                aria-label={`Formula: ${f.title}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: '#e2eaf4' }}>{f.title}</span>
                  <span className={`badge ${f.tagColor}`}>{f.tag}</span>
                </div>
                <code
                  className="text-sm font-bold px-2 py-1 rounded"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    color: isActive ? 'var(--color-neon-cyan)' : '#a0c8e0',
                    fontFamily: 'var(--font-mono)',
                    display: 'block',
                    textShadow: isActive ? '0 0 8px rgba(0,245,255,0.6)' : 'none',
                  }}
                >
                  {f.formula}
                </code>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {f.explain}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Trade-offs Tab */}
      {tab === 'tradeoffs' && (
        <div className="flex flex-col gap-3">
          {TRADEOFFS.map((t) => (
            <div key={t.strategy} className="glass-card p-3 flex flex-col gap-2">
              <h3 className="text-sm font-bold" style={{ color: t.color, fontFamily: 'var(--font-mono)' }}>
                {t.strategy}
              </h3>
              <div className="flex flex-col gap-1">
                {t.pros.map((p) => (
                  <div key={p} className="flex items-start gap-1.5 text-xs" style={{ color: '#00ff88' }}>
                    <span>✓</span><span>{p}</span>
                  </div>
                ))}
                {t.cons.map((c) => (
                  <div key={c} className="flex items-start gap-1.5 text-xs" style={{ color: '#ff6688' }}>
                    <span>✗</span><span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Clustering comparison */}
          <div className="glass-card p-3 flex flex-col gap-2">
            <h3 className="text-xs font-bold" style={{ color: 'var(--color-neon-amber)' }}>Clustering Comparison</h3>
            {[
              { label: 'Linear',    val: 'Primary',   w: '90%', col: '#ff3366' },
              { label: 'Quadratic', val: 'Secondary', w: '45%', col: '#ffaa00' },
              { label: 'Double',    val: 'None',      w: '5%',  col: '#00ff88' },
            ].map(({ label, val, w, col }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs w-20" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: w, background: col, boxShadow: `0 0 6px ${col}`, transition: 'width 0.5s ease' }} />
                </div>
                <span className="text-xs w-16 text-right" style={{ color: col }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
