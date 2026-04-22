// ─── Core Domain Types ──────────────────────────────────────────────────────

export type Strategy = 'chaining' | 'linear' | 'quadratic' | 'double';
export type SlotState = 'empty' | 'occupied' | 'deleted';
export type EventType =
  | 'insert'
  | 'search'
  | 'delete'
  | 'probe'
  | 'collision'
  | 'found'
  | 'not_found'
  | 'chain'
  | 'tombstone'
  | 'resize';

export interface Slot<K = number, V = string> {
  key: K | null;
  value: V | null;
  chain: ChainNode<K, V>[] | null; // for chaining strategy
  state: SlotState;
  probeCount: number; // how many times probed (for heatmap)
}

export interface ChainNode<K = number, V = string> {
  key: K;
  value: V;
}

export interface HashTableState {
  slots: Slot[];
  m: number;       // table size
  n: number;       // number of keys inserted
  strategy: Strategy;
  collisionCount: number;
  totalProbes: number;
  probeLengthHistogram: number[]; // index = probe length, value = frequency
}

export interface AnimationEvent {
  type: EventType;
  slotIndex: number;
  key: number;
  probeStep?: number;      // which probe iteration (0-indexed)
  chainIndex?: number;     // which node in the chain
  description: string;     // human-readable for ARIA live region
  timestamp: number;
  formulaHighlight?: FormulaId;
}

export type FormulaId =
  | 'hash_fn'
  | 'load_factor'
  | 'chain_length'
  | 'collision_prob'
  | 'linear_probe'
  | 'quad_probe'
  | 'double_hash';

// ─── Operation Results ───────────────────────────────────────────────────────

export interface InsertResult {
  success: boolean;
  finalSlot: number;
  probes: number;
  events: AnimationEvent[];
}

export interface SearchResult {
  found: boolean;
  probes: number;
  events: AnimationEvent[];
}

export interface DeleteResult {
  success: boolean;
  events: AnimationEvent[];
}

// ─── Control Panel State ─────────────────────────────────────────────────────

export interface ControlPanelConfig {
  m: number;           // table size (4–64)
  strategy: Strategy;
  animationSpeed: number; // 0.25x – 4x
  c1: number;          // quadratic probing c1
  c2: number;          // quadratic probing c2
}

// ─── Scene Object Refs (Three.js) ────────────────────────────────────────────

export interface BucketMeshRef {
  index: number;
  mesh: unknown; // THREE.Mesh
  fillBar: unknown; // THREE.Mesh
  label: unknown; // CSS2DObject
}

export interface SphereMeshRef {
  key: number;
  mesh: unknown; // THREE.Mesh
  label: unknown; // CSS2DObject
  slotIndex: number;
  chainIndex?: number;
}

// ─── App-level Step Debugger ─────────────────────────────────────────────────

export interface StepRecord {
  eventIndex: number;
  event: AnimationEvent;
  tableSnapshot: HashTableState;
}
