import { Suspense, lazy, useState } from 'react';
import { useHashStore } from './store/hashStore';
import ControlPanel from './components/ControlPanel';
import StatsPanel from './components/StatsPanel';
import FormulaPanel from './components/FormulaPanel';
import TableView from './components/TableView';
import EventLog from './components/EventLog';
import ExplainModal from './components/ExplainModal';

const ThreeScene = lazy(() => import('./components/ThreeScene'));

function App() {
  const ariaMsg      = useHashStore((s) => s.ariaMessage);
  const table        = useHashStore((s) => s.table);
  const [showExplain, setShowExplain] = useState(true); // open on first load
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sidebar toggle

  const handleBatchInsert = () => {
    const { insert } = useHashStore.getState();
    const keys = Array.from({ length: 8 }, () => Math.floor(Math.random() * 200));
    keys.forEach((k, i) => setTimeout(() => insert(k), i * 300));
  };

  return (
    <div
      className="flex flex-col h-screen w-screen bg-[var(--color-bg-dark)] overflow-hidden"
    >
      {/* ── Top Bar ───────────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-4 py-2 shrink-0 glass z-50 border-b border-[rgba(0,245,255,0.12)]"
        style={{ background: 'rgba(8,12,20,0.95)' }}
      >
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button
            className="mobile-only btn-ghost p-1 w-8 h-8 flex items-center justify-center"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>

          {/* Logo / Title */}
          <div className="flex items-center gap-2">
            <svg className="hidden sm:block" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#00f5ff" strokeWidth="1.5" opacity="0.4"/>
              <circle cx="12" cy="12" r="5"  stroke="#00f5ff" strokeWidth="1.5" opacity="0.7"/>
              <circle cx="12" cy="12" r="2"  fill="#00f5ff"/>
            </svg>
            <h1
              className="text-sm sm:text-base font-bold tracking-widest"
              style={{ color: 'var(--color-neon-cyan)', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em' }}
            >
              HASHVIZ<span className="hidden sm:inline"> <span style={{ color: 'rgba(0,245,255,0.4)', fontSize: 11 }}>3D</span></span>
            </h1>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className="btn-ghost text-[10px] sm:text-xs flex items-center gap-1.5"
            onClick={() => setShowExplain(true)}
          >
            <span className="hidden xs:inline">📚</span> Learn
          </button>
          
          <button
            className="btn-ghost text-[10px] sm:text-xs desktop-only"
            onClick={handleBatchInsert}
          >
            ⚡ Batch ×8
          </button>

          <div
            className="hidden xs:flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded border border-[rgba(191,95,255,0.25)] bg-[rgba(191,95,255,0.1)]"
          >
            <span className="text-[10px] sm:text-xs font-mono text-[#bf5fff]">MVP</span>
          </div>

          <div
            className="text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded border border-[rgba(0,245,255,0.15)] bg-[rgba(0,0,0,0.4)] font-mono"
            style={{
              color:
                table.n / table.m > 0.7 ? 'var(--color-neon-red)' :
                table.n / table.m > 0.4 ? 'var(--color-neon-amber)' :
                'var(--color-neon-green)',
            }}
          >
            α={ (table.n / table.m).toFixed(2) }
          </div>
        </div>
      </header>

      {/* ── Main Layout ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left: Control Panel (Mobile Drawer) */}
        <div
          className={`shrink-0 overflow-y-auto p-2 sidebar-transition mobile-sidebar ${!sidebarOpen ? 'mobile-sidebar-hidden' : ''} md:relative md:translate-x-0 md:opacity-100 md:flex md:w-[280px] bg-[rgba(8,12,20,0.6)]`}
        >
          <div className="w-full flex flex-col gap-2">
            <ControlPanel />
            <div className="md:hidden">
               <StatsPanel />
            </div>
            <div className="md:hidden mt-2">
               <button className="btn-primary w-full" onClick={() => setSidebarOpen(false)}>Close Menu</button>
            </div>
          </div>
        </div>

        {/* Center: 3D Canvas + Bottom panels */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* 3D Scene */}
          <div className="flex-1 relative bg-[#080c14]">
            <Suspense fallback={<div className="flex items-center justify-center h-full text-cyan-400 font-mono">Loading Scene...</div>}>
              <ThreeScene />
            </Suspense>
            <FormulaOverlay />
          </div>

          {/* Bottom row: Table view + Event log (Responsive) */}
          <div
            className="shrink-0 flex flex-col sm:flex-row gap-2 p-2 border-t border-[rgba(0,245,255,0.08)] bg-[rgba(8,12,20,0.7)]"
          >
            <div className="flex-1 min-w-0 overflow-x-auto">
              <TableView />
            </div>
            <div className="w-full sm:w-[300px] lg:w-[340px] shrink-0">
              <EventLog />
            </div>
          </div>
        </div>

        {/* Right column: Stats + Formula (Desktop Only, moves to drawer on mobile) */}
        <div
          className="hidden lg:flex shrink-0 flex-col gap-2 overflow-y-auto p-2 w-[450px] xl:w-[500px] bg-[rgba(8,12,20,0.6)]"
        >
          <div className="flex flex-col gap-2 h-full">
            <div className="flex-1 min-h-0">
              <StatsPanel />
            </div>
            <div className="flex-1 min-h-0">
              <FormulaPanel />
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-[90] backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Explain Modal ──────────────────────────────────────────────────────── */}
      {showExplain && <ExplainModal onClose={() => setShowExplain(false)} />}

      {/* ── ARIA live region ───────────────────────────────────────────────────── */}
      <div role="status" aria-live="polite" className="sr-only">{ariaMsg}</div>
    </div>
  );
}

function FormulaOverlay() {
  const activeId = useHashStore((s) => s.activeFormulaId);
  const formulaMap: Record<string, string> = {
    hash_fn: 'h(k) = k mod m',
    load_factor: 'α = n / m',
    chain_length: 'E[chain] = α',
    collision_prob: 'P ≈ 1 − e^(−α)',
    linear_probe: '(h(k) + i) mod m',
    quad_probe: '(h(k) + c₁i + c₂i²) mod m',
    double_hash: '(h₁(k) + i·h₂(k)) mod m',
  };
  if (!activeId) return null;
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-20">
      <div className="px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-[rgba(0,245,255,0.15)] border border-[rgba(0,245,255,0.5)] text-[var(--color-neon-cyan)] font-mono shadow-[0_0_20px_rgba(0,245,255,0.25)] animate-pulse">
        {formulaMap[activeId] ?? activeId}
      </div>
    </div>
  );
}

export default App;
