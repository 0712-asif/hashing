import { useEffect, useRef, useState } from 'react';
import { useHashStore } from '../store/hashStore';

interface LogEntry {
  id: number;
  msg: string;
  type: 'insert' | 'search' | 'delete' | 'info';
  time: string;
}

let logIdCounter = 0;

function classifyMsg(msg: string): LogEntry['type'] {
  if (msg.includes('inserted') || msg.includes('Batch'))  return 'insert';
  if (msg.includes('found') || msg.includes('Search'))    return 'search';
  if (msg.includes('deleted') || msg.includes('Deleted')) return 'delete';
  return 'info';
}

export default function EventLog() {
  const ariaMsg  = useHashStore((s) => s.ariaMessage);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const prevMsg  = useRef('');

  useEffect(() => {
    if (!ariaMsg || ariaMsg === prevMsg.current) return;
    prevMsg.current = ariaMsg;
    const entry: LogEntry = {
      id: logIdCounter++,
      msg: ariaMsg,
      type: classifyMsg(ariaMsg),
      time: new Date().toLocaleTimeString('en', { hour12: false }),
    };
    setLogs((prev) => [entry, ...prev].slice(0, 50));
  }, [ariaMsg]);

  const colMap: Record<string, string> = {
    insert: 'var(--color-neon-cyan)',
    search: 'var(--color-neon-green)',
    delete: 'var(--color-neon-red)',
    info:   'var(--color-text-muted)',
  };
  const iconMap: Record<string, string> = {
    insert: '↓', search: '🔍', delete: '✕', info: '·',
  };

  return (
    <div className="glass-card flex flex-col" style={{ maxHeight: 180 }}>
      <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(0,245,255,0.08)' }}>
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-neon-cyan)', fontFamily: 'var(--font-mono)' }}
        >
          EVENT LOG
        </span>
      </div>
      <div
        className="flex flex-col overflow-y-auto p-2 gap-0.5"
        style={{ maxHeight: 140 }}
        role="log"
        aria-live="polite"
        aria-label="Operation event log"
      >
        {logs.length === 0 && (
          <p
            className="text-xs text-center py-4"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Insert, search, or delete a key to see events…
          </p>
        )}
        {logs.map((entry) => (
          <div
            key={entry.id}
            className="log-entry flex items-center gap-2 px-2 py-0.5 rounded text-xs"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <span style={{ color: colMap[entry.type], minWidth: 14 }}>
              {iconMap[entry.type]}
            </span>
            <span style={{ color: 'var(--color-text-muted)', minWidth: 60 }}>
              {entry.time}
            </span>
            <span style={{ color: '#c8d8e8' }}>{entry.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
