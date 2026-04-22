import { useHashStore } from '../store/hashStore';

export default function TableView() {
  const table = useHashStore((s) => s.table);
  const { slots, m, strategy } = table;

  return (
    <div
      className="glass-card flex flex-col overflow-hidden"
      style={{ minHeight: 0 }}
      role="region"
      aria-label="Hash table slot view"
    >
      <div
        className="px-3 py-2 flex items-center justify-between border-b"
        style={{ borderColor: 'rgba(0,245,255,0.08)' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--color-neon-cyan)', fontFamily: 'var(--font-mono)' }}>
          TABLE SLOTS
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          m = {m} | strategy = {strategy}
        </span>
      </div>

      <div
        className="overflow-y-auto p-2"
        style={{ maxHeight: 220 }}
        role="list"
      >
        {slots.map((slot, i) => {
          const isOcc  = slot.state === 'occupied';
          const isDel  = slot.state === 'deleted';
          const chains = slot.chain?.length ?? 0;

          const borderCol =
            isDel  ? 'rgba(58,58,74,0.5)' :
            isOcc  ? 'rgba(0,245,255,0.25)' :
                     'rgba(0,245,255,0.05)';
          const bgCol =
            isDel  ? 'rgba(40,40,55,0.6)' :
            isOcc  ? 'rgba(0,50,80,0.5)'  :
                     'rgba(13,21,35,0.4)';

          return (
            <div
              key={i}
              role="listitem"
              aria-label={`Slot ${i}: ${slot.state}${isOcc ? `, key ${slot.key}` : ''}${chains > 1 ? `, ${chains} chained` : ''}`}
              tabIndex={0}
              className="flex items-center gap-2 px-2 py-1 mb-0.5 rounded text-xs transition-all duration-300"
              style={{
                border: `1px solid ${borderCol}`,
                background: bgCol,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {/* Slot index */}
              <span
                className="w-6 text-center font-bold"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {i}
              </span>

              {/* State indicator */}
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    isDel  ? '#3a3a4a' :
                    isOcc  ? '#00f5ff' : 'rgba(255,255,255,0.1)',
                  boxShadow: isOcc ? '0 0 6px #00f5ff' : 'none',
                }}
              />

              {/* Key / Value */}
              {isDel && (
                <span style={{ color: '#55556a' }}>— DELETED (tombstone) —</span>
              )}
              {isOcc && strategy !== 'chaining' && (
                <>
                  <span style={{ color: 'var(--color-neon-cyan)' }}>k={slot.key}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  <span style={{ color: '#a0c0d8' }}>{slot.value}</span>
                </>
              )}
              {isOcc && strategy === 'chaining' && slot.chain && (
                <div className="flex flex-wrap gap-1">
                  {slot.chain.map((node, ci) => (
                    <span
                      key={ci}
                      className="px-1 py-0.5 rounded"
                      style={{
                        background: 'rgba(0,245,255,0.12)',
                        border: '1px solid rgba(0,245,255,0.25)',
                        color: 'var(--color-neon-cyan)',
                        fontSize: 10,
                      }}
                    >
                      {node.key}
                    </span>
                  ))}
                  {chains > 1 && (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>
                      (chain ×{chains})
                    </span>
                  )}
                </div>
              )}
              {!isOcc && !isDel && (
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>— empty —</span>
              )}

              {/* Probe count badge */}
              {slot.probeCount > 0 && (
                <span
                  className="ml-auto badge"
                  style={{
                    background: slot.probeCount > 3 ? 'rgba(255,51,102,0.15)' : 'rgba(255,170,0,0.12)',
                    border: `1px solid ${slot.probeCount > 3 ? 'rgba(255,51,102,0.3)' : 'rgba(255,170,0,0.3)'}`,
                    color: slot.probeCount > 3 ? '#ff3366' : '#ffaa00',
                    fontSize: 9,
                  }}
                >
                  {slot.probeCount}p
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
