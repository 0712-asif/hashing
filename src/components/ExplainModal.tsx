import { useState } from 'react';

interface Props { onClose: () => void; }

const SECTIONS = [
  {
    id: 'what',
    icon: '🔑',
    title: 'What is Hashing?',
    color: '#00f5ff',
    content: (
      <div className="flex flex-col gap-3">
        <p style={{ color: '#c8d8e8', lineHeight: 1.7 }}>
          <strong style={{ color: '#00f5ff' }}>Hashing</strong> is a technique to store and retrieve data in <strong>O(1) average time</strong> by mapping a key to an array index using a <em>hash function</em>.
        </p>
        <div className="rounded-lg p-3" style={{ background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.25)' }}>
          <code style={{ color: '#00f5ff', fontFamily: 'var(--font-mono)', fontSize: 15 }}>
            h(k) = k mod m
          </code>
          <p className="mt-1 text-xs" style={{ color: '#7a9ab8' }}>
            k = key (integer) &nbsp;|&nbsp; m = table size &nbsp;|&nbsp; result = slot index [0 … m−1]
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {[
            { label: 'Key', val: '42', arrow: false },
            { label: 'h(42) = 42 mod 8', val: '→', arrow: true },
            { label: 'Slot 2', val: '2', arrow: false },
          ].map(({ label, val, arrow }) => (
            <div key={label} className={`flex flex-col items-center gap-1 p-2 rounded ${arrow ? '' : 'glass-card'}`}>
              {!arrow && <span className="text-xs" style={{ color: '#6b82a0' }}>{label}</span>}
              {!arrow && <span className="text-xl font-bold font-mono" style={{ color: '#00f5ff' }}>{val}</span>}
              {arrow && <span className="text-2xl" style={{ color: '#00f5ff', marginTop: 16 }}>→</span>}
              {arrow && <span className="text-xs text-center" style={{ color: '#6b82a0' }}>{label}</span>}
            </div>
          ))}
        </div>
        <p style={{ color: '#c8d8e8', lineHeight: 1.6, fontSize: 13 }}>
          The <strong style={{ color: '#ffaa00' }}>Load Factor α = n/m</strong> measures how full the table is. When two keys hash to the same slot, a <strong style={{ color: '#ff3366' }}>collision</strong> occurs. There are two main strategies to handle collisions.
        </p>
      </div>
    ),
  },
  {
    id: 'open',
    icon: '⛓️',
    title: 'Open Hashing (Separate Chaining)',
    color: '#00ff88',
    content: (
      <div className="flex flex-col gap-3">
        <p style={{ color: '#c8d8e8', lineHeight: 1.7 }}>
          Also called <strong style={{ color: '#00ff88' }}>Separate Chaining</strong> or <strong style={{ color: '#00ff88' }}>Open Hashing</strong>. Each slot holds a <strong>linked list</strong> of all keys that hash to it. The table is "open" — it can store more items than its slot count.
        </p>

        {/* Visual diagram */}
        <div className="rounded-lg p-3" style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)' }}>
          <p className="text-xs mb-2" style={{ color: '#6b82a0', fontFamily: 'var(--font-mono)' }}>Example: Insert keys 5, 13, 21 into m=8 table</p>
          <p className="text-xs mb-1" style={{ color: '#6b82a0' }}>h(5)=5, h(13)=5, h(21)=5  →  all land on slot 5!</p>
          <div className="flex items-start gap-2 mt-2 flex-wrap">
            {[0,1,2,3,4,5,6,7].map(i => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-mono"
                  style={{ background: i === 5 ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${i === 5 ? 'rgba(0,255,136,0.5)' : 'rgba(255,255,255,0.1)'}`, color: i === 5 ? '#00ff88' : '#4a6480' }}>
                  {i}
                </div>
                {i === 5 && (
                  <div className="flex flex-col items-center mt-0.5">
                    {['5','13','21'].map((k, ci) => (
                      <div key={k} className="flex items-center">
                        {ci > 0 && <div className="w-0.5 h-2" style={{ background: '#00ff88', opacity: 0.5 }} />}
                        <div className="w-8 h-7 rounded flex items-center justify-center text-xs font-mono mt-0.5"
                          style={{ background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.4)', color: '#00ff88' }}>{k}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2" style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#00ff88' }}>✓ Advantages</p>
            {['No table overflow','Simple to implement','O(1 + α) avg search','Delete is easy'].map(t => (
              <p key={t} className="text-xs" style={{ color: '#a0c8b8' }}>• {t}</p>
            ))}
          </div>
          <div className="rounded-lg p-2" style={{ background: 'rgba(255,51,102,0.06)', border: '1px solid rgba(255,51,102,0.15)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#ff6688' }}>✗ Disadvantages</p>
            {['Extra pointer memory','Cache unfriendly','Linked list overhead','Memory fragmentation'].map(t => (
              <p key={t} className="text-xs" style={{ color: '#c08090' }}>• {t}</p>
            ))}
          </div>
        </div>

        <div className="rounded p-2" style={{ background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.15)' }}>
          <p className="text-xs font-mono" style={{ color: '#00f5ff' }}>E[search time] = O(1 + α)</p>
          <p className="text-xs mt-1" style={{ color: '#6b82a0' }}>α can exceed 1 — the chain just grows longer</p>
        </div>
      </div>
    ),
  },
  {
    id: 'closed',
    icon: '🔒',
    title: 'Closed Hashing (Open Addressing)',
    color: '#ffaa00',
    content: (
      <div className="flex flex-col gap-3">
        <p style={{ color: '#c8d8e8', lineHeight: 1.7 }}>
          Also called <strong style={{ color: '#ffaa00' }}>Open Addressing</strong> or <strong style={{ color: '#ffaa00' }}>Closed Hashing</strong>. All keys live <strong>directly in the array</strong> — no linked lists. On collision, it <em>probes</em> for the next empty slot.
        </p>

        <div className="rounded-lg p-3" style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.25)' }}>
          <p className="text-xs mb-2 font-bold" style={{ color: '#ffaa00', fontFamily: 'var(--font-mono)' }}>3 Probing Methods:</p>
          {[
            { name: 'Linear Probing', formula: '(h(k) + i) mod m', problem: 'Primary Clustering', color: '#ff6688' },
            { name: 'Quadratic Probing', formula: '(h(k) + c₁i + c₂i²) mod m', problem: 'Secondary Clustering', color: '#ffaa00' },
            { name: 'Double Hashing', formula: '(h₁(k) + i·h₂(k)) mod m', problem: 'No Clustering ✓', color: '#00ff88' },
          ].map(({ name, formula, problem, color }) => (
            <div key={name} className="mb-2 pl-2" style={{ borderLeft: `2px solid ${color}` }}>
              <p className="text-xs font-bold" style={{ color }}>{name}</p>
              <code className="text-xs" style={{ color: '#c8d8e8', fontFamily: 'var(--font-mono)' }}>{formula}</code>
              <p className="text-xs" style={{ color: '#6b82a0' }}>Clustering: {problem}</p>
            </div>
          ))}
        </div>

        {/* Probe animation example */}
        <div className="rounded-lg p-3" style={{ background: 'rgba(255,170,0,0.05)', border: '1px solid rgba(255,170,0,0.2)' }}>
          <p className="text-xs mb-2" style={{ color: '#6b82a0' }}>Linear Probe example: Insert k=10, m=8 → h(10)=2 is full</p>
          <div className="flex gap-1 flex-wrap">
            {[0,1,2,3,4,5,6,7].map(i => {
              const occupied = [1,2].includes(i);
              const landing  = i === 3;
              const probed   = i === 2;
              return (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-mono"
                    style={{
                      background: landing ? 'rgba(255,170,0,0.3)' : probed ? 'rgba(255,51,102,0.2)' : occupied ? 'rgba(0,245,255,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${landing ? 'rgba(255,170,0,0.7)' : probed ? 'rgba(255,51,102,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      color: landing ? '#ffaa00' : probed ? '#ff6688' : '#4a6480',
                    }}>
                    {landing ? '10' : occupied ? '·' : i}
                  </div>
                  <span className="text-xs" style={{ color: '#4a6480', fontSize: 9 }}>{i}</span>
                  {probed && <span className="text-xs" style={{ color: '#ff6688', fontSize: 8 }}>full!</span>}
                  {landing && <span className="text-xs" style={{ color: '#ffaa00', fontSize: 8 }}>✓ land</span>}
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-1" style={{ color: '#6b82a0' }}>Probe sequence: slot 2 (full) → slot 3 (empty ✓)</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2" style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#00ff88' }}>✓ Advantages</p>
            {['Cache-friendly (contiguous)','No extra allocations','Better memory locality'].map(t => (
              <p key={t} className="text-xs" style={{ color: '#a0c8b8' }}>• {t}</p>
            ))}
          </div>
          <div className="rounded-lg p-2" style={{ background: 'rgba(255,51,102,0.06)', border: '1px solid rgba(255,51,102,0.15)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#ff6688' }}>✗ Disadvantages</p>
            {['Table can overflow (α ≤ 1)','Degrades badly at α > 0.7','Delete needs tombstones','Clustering issues'].map(t => (
              <p key={t} className="text-xs" style={{ color: '#c08090' }}>• {t}</p>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'compare',
    icon: '⚖️',
    title: 'Quick Comparison',
    color: '#bf5fff',
    content: (
      <div className="flex flex-col gap-3">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Property','Open Hashing (Chaining)','Closed Hashing (Open Addr.)'].map(h => (
                  <th key={h} className="p-2 text-left" style={{ color: '#bf5fff', borderBottom: '1px solid rgba(191,95,255,0.3)', fontFamily: 'var(--font-mono)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Keys per slot',   'Unlimited (chain)',   'Exactly 1'],
                ['α allowed',       '> 1 OK',              'Must be < 1'],
                ['Memory',          'Extra pointers',      'No overhead'],
                ['Cache perf.',     'Poor (pointers)',     'Excellent'],
                ['Delete',         'Simple removal',      'Tombstone needed'],
                ['Best at α',      'Any load',            'α < 0.7'],
                ['Search avg',     'O(1 + α)',            'O(1/(1−α))'],
              ].map(([prop, open, closed], ri) => (
                <tr key={prop} style={{ background: ri % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <td className="p-2 font-bold" style={{ color: '#8090a8', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{prop}</td>
                  <td className="p-2" style={{ color: '#00ff88', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{open}</td>
                  <td className="p-2" style={{ color: '#ffaa00', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{closed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg p-3 mt-1" style={{ background: 'rgba(191,95,255,0.07)', border: '1px solid rgba(191,95,255,0.2)' }}>
          <p className="text-xs font-bold mb-1" style={{ color: '#bf5fff' }}>🎓 When to use which?</p>
          <p className="text-xs" style={{ color: '#c8d8e8', lineHeight: 1.6 }}>
            Use <strong style={{ color: '#00ff88' }}>Chaining</strong> when you don't know the load in advance, deletions are frequent, or simplicity matters.<br />
            Use <strong style={{ color: '#ffaa00' }}>Open Addressing</strong> when memory is tight, cache performance is critical, and you can keep α below 0.7 (e.g., most standard library hash maps use a mix).
          </p>
        </div>
      </div>
    ),
  },
];

export default function ExplainModal({ onClose }: Props) {
  const [active, setActive] = useState(0);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Hashing concepts explained"
    >
      <div
        className="flex flex-col"
        style={{
          width: 'min(860px, 95vw)',
          maxHeight: '90vh',
          background: 'rgba(8,14,26,0.97)',
          border: '1px solid rgba(0,245,255,0.2)',
          borderRadius: 16,
          boxShadow: '0 0 60px rgba(0,245,255,0.1), 0 0 120px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(0,245,255,0.1)' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#00f5ff', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
              📚 HASHING — CONCEPTS EXPLAINED
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#6b82a0' }}>
              Everything you need to understand Hash Tables, Chaining & Open Addressing
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
            style={{ background: 'rgba(255,51,102,0.12)', border: '1px solid rgba(255,51,102,0.3)', color: '#ff3366', cursor: 'pointer' }}
            aria-label="Close explanation"
          >✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3" style={{ flexShrink: 0 }}>
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActive(i)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium transition-all duration-200"
              style={{
                background:   active === i ? 'rgba(0,245,255,0.08)' : 'transparent',
                border:       `1px solid ${active === i ? s.color : 'rgba(255,255,255,0.07)'}`,
                borderBottom: active === i ? `1px solid rgba(8,14,26,0.97)` : '1px solid rgba(255,255,255,0.07)',
                color:        active === i ? s.color : '#6b82a0',
                cursor:       'pointer',
                fontFamily:   'var(--font-mono)',
              }}
            >
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.title.split('(')[0].trim()}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,245,255,0.08)' }}
        >
          <h3 className="text-base font-bold mb-3" style={{ color: SECTIONS[active].color, fontFamily: 'var(--font-mono)' }}>
            {SECTIONS[active].icon} {SECTIONS[active].title}
          </h3>
          {SECTIONS[active].content}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid rgba(0,245,255,0.08)', flexShrink: 0 }}>
          <button
            onClick={() => setActive(Math.max(0, active - 1))}
            disabled={active === 0}
            className="btn-ghost text-xs"
          >← Prev</button>
          <div className="flex gap-1.5">
            {SECTIONS.map((_, i) => (
              <div
                key={i}
                onClick={() => setActive(i)}
                className="w-2 h-2 rounded-full cursor-pointer transition-all duration-200"
                style={{ background: i === active ? '#00f5ff' : 'rgba(0,245,255,0.2)', boxShadow: i === active ? '0 0 6px #00f5ff' : 'none' }}
              />
            ))}
          </div>
          {active < SECTIONS.length - 1
            ? <button onClick={() => setActive(active + 1)} className="btn-ghost text-xs">Next →</button>
            : <button onClick={onClose} className="btn-primary text-xs">Start Visualizing →</button>
          }
        </div>
      </div>
    </div>
  );
}
