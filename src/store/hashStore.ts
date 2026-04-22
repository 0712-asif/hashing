import { create } from 'zustand';
import type {
  HashTableState, Strategy, Slot, AnimationEvent,
  InsertResult, SearchResult, DeleteResult, StepRecord, FormulaId,
} from '../types/hashing';

// ─── Hash Functions ──────────────────────────────────────────────────────────
function h1(k: number, m: number): number { return ((k % m) + m) % m; }
function h2(k: number, m: number): number {
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67];
  const p = primes.filter(x => x < m).reverse()[0] || 3;
  return p - (k % p);
}
function makeSlot(): Slot { return { key: null, value: null, chain: [], state: 'empty', probeCount: 0 }; }
function makeTable(m: number): Slot[] { return Array.from({ length: m }, makeSlot); }

function nextProbe(key: number, h: number, i: number, m: number, strategy: Strategy): number {
  const C1 = 0.5, C2 = 0.5;
  switch (strategy) {
    case 'linear':    return ((h + i) % m + m) % m;
    case 'quadratic': return ((h + Math.floor(C1 * i) + Math.floor(C2 * i * i)) % m + m) % m;
    case 'double':    return ((h + i * h2(key, m)) % m + m) % m;
    default:          return ((h + i) % m + m) % m;
  }
}
function probeFormulaId(strategy: Strategy): FormulaId {
  switch (strategy) {
    case 'linear':    return 'linear_probe';
    case 'quadratic': return 'quad_probe';
    case 'double':    return 'double_hash';
    default:          return 'hash_fn';
  }
}

// ─── Zustand Store ───────────────────────────────────────────────────────────
interface HashStore {
  table: HashTableState;
  pendingEvents: AnimationEvent[];
  activeFormulaId: FormulaId | null;
  stepHistory: StepRecord[];
  currentStepIndex: number;
  ariaMessage: string;
  insert: (key: number, value?: string) => InsertResult;
  search: (key: number) => SearchResult;
  deleteKey: (key: number) => DeleteResult;
  resize: (newM: number) => void;
  setStrategy: (strategy: Strategy) => void;
  clearTable: () => void;
  consumeEvents: () => AnimationEvent[];
  setActiveFormula: (id: FormulaId | null) => void;
  setAriaMessage: (msg: string) => void;
  stepForward: () => void;
  stepBack: () => void;
}

export const useHashStore = create<HashStore>((set, get) => ({
  table: {
    slots: makeTable(8), m: 8, n: 0, strategy: 'chaining',
    collisionCount: 0, totalProbes: 0, probeLengthHistogram: new Array(20).fill(0),
  },
  pendingEvents: [], activeFormulaId: null,
  stepHistory: [], currentStepIndex: -1, ariaMessage: '',

  setAriaMessage: (msg) => set({ ariaMessage: msg }),
  setActiveFormula: (id) => set({ activeFormulaId: id }),
  consumeEvents: () => { const evs = get().pendingEvents; set({ pendingEvents: [] }); return evs; },

  setStrategy: (strategy) =>
    set((s) => ({ table: { ...s.table, strategy, slots: s.table.slots.map((slot) => ({ ...slot })) } })),

  clearTable: () =>
    set((s) => ({
      table: { ...s.table, slots: makeTable(s.table.m), n: 0, collisionCount: 0, totalProbes: 0, probeLengthHistogram: new Array(20).fill(0) },
      stepHistory: [], currentStepIndex: -1, ariaMessage: 'Table cleared.', pendingEvents: [],
    })),

  resize: (newM) => {
    const { table } = get();
    const newSlots = makeTable(newM);
    table.slots.forEach((slot) => {
      if (slot.state !== 'occupied' || slot.key === null) return;
      const allKeys = table.strategy === 'chaining' && slot.chain?.length
        ? slot.chain.map(n => ({ key: n.key, value: n.value }))
        : [{ key: slot.key, value: slot.value! }];
      allKeys.forEach(({ key, value }) => {
        const idx = h1(key, newM);
        if (table.strategy === 'chaining') {
          if (newSlots[idx].state === 'empty') {
            newSlots[idx] = { key, value, chain: [{ key, value }], state: 'occupied', probeCount: 0 };
          } else { newSlots[idx].chain!.push({ key, value }); }
        } else {
          let i = 0, probe = idx;
          while (newSlots[probe].state === 'occupied' && i < newM) probe = (idx + (++i)) % newM;
          if (newSlots[probe].state !== 'occupied')
            newSlots[probe] = { key, value, chain: null, state: 'occupied', probeCount: i };
        }
      });
    });
    const n = newSlots.filter((s) => s.state === 'occupied').length;
    set({ table: { ...table, slots: newSlots, m: newM, n, collisionCount: 0, totalProbes: 0, probeLengthHistogram: new Array(20).fill(0) }, ariaMessage: `Table resized to ${newM} slots.` });
  },

  insert: (key, value = `v${key}`) => {
    const { table } = get();
    const { m, strategy, slots } = table;
    const events: AnimationEvent[] = [];
    const now = Date.now();
    let probes = 0, finalSlot = -1, collisions = 0;

    const hashIndex = h1(key, m);

    // ── CHAINING (Open Hashing) ──────────────────────────────────────────────
    // Visual: sphere arcs to bucket, stacks vertically with a rod connecting it
    // to previous sphere if it's a collision.
    if (strategy === 'chaining') {
      const newSlots = slots.map((s) => ({ ...s, chain: s.chain ? [...s.chain] : [] }));
      const slot = newSlots[hashIndex];
      const chainLenBefore = slot.chain?.length ?? 0;

      if (chainLenBefore > 0) collisions++;

      slot.chain = slot.chain || [];
      slot.chain.push({ key, value });
      slot.state = 'occupied';
      slot.key = slot.chain[0].key;
      slot.value = slot.chain[0].value;
      finalSlot = hashIndex;

      // Emit ONE event: type='chain' carries chainIndex = position in chain.
      // ThreeScene creates sphere, arcs it to bucket at Y offset = chainIndex.
      events.push({
        type: 'chain',
        slotIndex: hashIndex,
        key,
        chainIndex: chainLenBefore,   // 0 = first item, 1 = second, etc.
        formulaHighlight: chainLenBefore > 0 ? 'chain_length' : 'hash_fn',
        description: chainLenBefore > 0
          ? `Collision! Key ${key} chained at slot ${hashIndex} (chain length now ${slot.chain.length}).`
          : `Key ${key} → slot ${hashIndex} (h(${key}) = ${key} mod ${m}).`,
        timestamp: now,
      });

      const hist = [...table.probeLengthHistogram];
      hist[0]++;
      set((s) => ({
        table: { ...s.table, slots: newSlots, n: s.table.n + 1, collisionCount: s.table.collisionCount + collisions },
        pendingEvents: [...s.pendingEvents, ...events],
        ariaMessage: `Key ${key} inserted at slot ${hashIndex}${collisions ? ' (chaining, collision)' : ''}.`,
      }));
      return { success: true, finalSlot, probes: 0, events };
    }

    // ── OPEN ADDRESSING (Closed Hashing) ────────────────────────────────────
    // Visual: sphere materialises at hashIndex bucket, then BOUNCES to next
    // buckets until it finds an empty one — each bucket hop is a 'probe' event.
    // The FINAL landing is an 'insert' event.
    const newSlots = slots.map((s) => ({ ...s }));
    let idx = hashIndex;
    let i = 0;

    // First: emit a 'spawn' event so ThreeScene creates the sphere at hashIndex
    events.push({
      type: 'probe',          // type=probe with probeStep=0 means "spawn here first"
      slotIndex: hashIndex,
      key,
      probeStep: -1,          // -1 = initial spawn marker (no hop yet)
      formulaHighlight: 'hash_fn',
      description: `h(${key}) = ${key} mod ${m} = ${hashIndex} (probe start)`,
      timestamp: now,
    });

    while (i < m) {
      const slot = newSlots[idx];

      if (slot.state === 'empty' || slot.state === 'deleted') {
        // Found empty slot — land here
        newSlots[idx] = { key, value, chain: null, state: 'occupied', probeCount: i };
        finalSlot = idx;
        events.push({
          type: 'insert',
          slotIndex: idx,
          key,
          probeStep: i,
          formulaHighlight: probeFormulaId(strategy),
          description: i === 0
            ? `Key ${key} landed directly at slot ${idx}.`
            : `Key ${key} landed at slot ${idx} after ${i} probe(s).`,
          timestamp: now + i * 10 + 5,
        });
        break;
      }

      // Slot occupied — emit probe-hop event showing sphere bouncing here
      if (i === 0) collisions++;
      events.push({
        type: 'probe',
        slotIndex: idx,
        key,
        probeStep: i,
        formulaHighlight: probeFormulaId(strategy),
        description: `Probe ${i}: slot ${idx} is occupied (key ${slot.key}), probing next…`,
        timestamp: now + i * 10,
      });
      i++;
      probes++;
      idx = nextProbe(key, hashIndex, i, m, strategy);
    }

    if (finalSlot === -1) {
      set({ ariaMessage: 'Table is full! Cannot insert.' });
      return { success: false, finalSlot: -1, probes, events };
    }

    const hist = [...table.probeLengthHistogram];
    hist[Math.min(probes, hist.length - 1)]++;
    set((s) => ({
      table: { ...s.table, slots: newSlots, n: s.table.n + 1, collisionCount: s.table.collisionCount + collisions, totalProbes: s.table.totalProbes + probes, probeLengthHistogram: hist },
      pendingEvents: [...s.pendingEvents, ...events],
      ariaMessage: `Key ${key} inserted at slot ${finalSlot} after ${probes} probe(s).`,
    }));
    return { success: true, finalSlot, probes, events };
  },

  search: (key) => {
    const { table } = get();
    const { m, strategy, slots } = table;
    const events: AnimationEvent[] = [];
    const now = Date.now();
    let probes = 0;
    const hashIndex = h1(key, m);

    events.push({ type: 'search', slotIndex: hashIndex, key, formulaHighlight: 'hash_fn', description: `Searching key ${key}: h(${key})=${hashIndex}`, timestamp: now });

    if (strategy === 'chaining') {
      const slot = slots[hashIndex];
      const found = slot.chain?.some((n) => n.key === key) ?? false;
      events.push({ type: found ? 'found' : 'not_found', slotIndex: hashIndex, key, description: found ? `Key ${key} found in chain at slot ${hashIndex}.` : `Key ${key} not found.`, timestamp: now + 1 });
      set({ ariaMessage: found ? `Key ${key} found at slot ${hashIndex}.` : `Key ${key} not found.`, pendingEvents: events });
      return { found, probes: 1, events };
    }

    let idx = hashIndex, i = 0;
    while (i < m) {
      const slot = slots[idx];
      if (slot.state === 'empty') {
        events.push({ type: 'not_found', slotIndex: idx, key, probeStep: i, description: `Key ${key} not found after ${i} probe(s).`, timestamp: now + i });
        set({ ariaMessage: `Key ${key} not found.`, pendingEvents: events });
        return { found: false, probes: i, events };
      }
      if (slot.state === 'occupied' && slot.key === key) {
        events.push({ type: 'found', slotIndex: idx, key, probeStep: i, description: `Key ${key} found at slot ${idx} after ${i} probe(s).`, timestamp: now + i });
        set({ ariaMessage: `Key ${key} found at slot ${idx} after ${i} probe(s).`, pendingEvents: events });
        return { found: true, probes: i, events };
      }
      events.push({ type: 'probe', slotIndex: idx, key, probeStep: i, formulaHighlight: probeFormulaId(strategy), description: `Probe ${i}: slot ${idx} has key ${slot.key}, continuing…`, timestamp: now + i });
      i++; probes++;
      idx = nextProbe(key, hashIndex, i, m, strategy);
    }
    set({ ariaMessage: `Key ${key} not found.`, pendingEvents: events });
    return { found: false, probes, events };
  },

  deleteKey: (key) => {
    const { table } = get();
    const { m, strategy, slots } = table;
    const events: AnimationEvent[] = [];
    const now = Date.now();
    const hashIndex = h1(key, m);

    if (strategy === 'chaining') {
      const newSlots = slots.map((s) => ({ ...s, chain: s.chain ? [...s.chain] : [] }));
      const slot = newSlots[hashIndex];
      const before = slot.chain?.length || 0;
      slot.chain = slot.chain?.filter((n) => n.key !== key) || [];
      if (slot.chain.length < before) {
        if (slot.chain.length === 0) newSlots[hashIndex] = makeSlot();
        else { slot.key = slot.chain[0].key; slot.value = slot.chain[0].value; }
        events.push({ type: 'delete', slotIndex: hashIndex, key, description: `Key ${key} removed from chain at slot ${hashIndex}.`, timestamp: now });
        set((s) => ({ table: { ...s.table, slots: newSlots, n: s.table.n - 1 }, pendingEvents: events, ariaMessage: `Key ${key} deleted from slot ${hashIndex}.` }));
        return { success: true, events };
      }
      set({ ariaMessage: `Key ${key} not found for deletion.` });
      return { success: false, events };
    }

    const newSlots = slots.map((s) => ({ ...s }));
    let idx = hashIndex, i = 0;
    while (i < m) {
      const slot = newSlots[idx];
      if (slot.state === 'empty') break;
      if (slot.state === 'occupied' && slot.key === key) {
        newSlots[idx] = { key: null, value: null, chain: null, state: 'deleted', probeCount: 0 };
        events.push({ type: 'tombstone', slotIndex: idx, key, description: `Key ${key} tombstoned at slot ${idx}.`, timestamp: now });
        set((s) => ({ table: { ...s.table, slots: newSlots, n: s.table.n - 1 }, pendingEvents: events, ariaMessage: `Key ${key} deleted (tombstone) at slot ${idx}.` }));
        return { success: true, events };
      }
      i++; idx = nextProbe(key, hashIndex, i, m, strategy);
    }
    set({ ariaMessage: `Key ${key} not found for deletion.` });
    return { success: false, events };
  },

  stepForward: () => {
    const { currentStepIndex, stepHistory } = get();
    if (currentStepIndex < stepHistory.length - 1) set({ currentStepIndex: currentStepIndex + 1 });
  },
  stepBack: () => {
    const { currentStepIndex, stepHistory } = get();
    if (currentStepIndex > 0) {
      const prev = stepHistory[currentStepIndex - 1];
      set({ currentStepIndex: currentStepIndex - 1, table: prev.tableSnapshot });
    }
  },
}));

export type { Strategy };
