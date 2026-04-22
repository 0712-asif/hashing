import { useHashStore } from '../store/hashStore';

export default function TestPanel() {
  const { setStrategy, resize, clearTable, insert, search, deleteKey } = useHashStore();

  const runTest1 = async () => {
    clearTable();
    setStrategy('chaining');
    resize(10);
    await new Promise(r => setTimeout(r, 100));
    
    // Insert 14, 24, 34
    insert(14);
    await new Promise(r => setTimeout(r, 1000));
    insert(24);
    await new Promise(r => setTimeout(r, 1000));
    insert(34);
    await new Promise(r => setTimeout(r, 1500));
    
    // Delete 24
    deleteKey(24);
    await new Promise(r => setTimeout(r, 1000));
    
    // Search 34
    search(34);
  };

  const runTest2 = async () => {
    clearTable();
    setStrategy('linear');
    resize(10);
    await new Promise(r => setTimeout(r, 100));
    
    // Insert 15, 25, 35
    insert(15);
    await new Promise(r => setTimeout(r, 1000));
    insert(25);
    await new Promise(r => setTimeout(r, 1200));
    insert(35);
    await new Promise(r => setTimeout(r, 1500));
    
    // Delete 25
    deleteKey(25);
    await new Promise(r => setTimeout(r, 1000));
    
    // Search 35
    search(35);
    await new Promise(r => setTimeout(r, 1500));
    
    // Insert 45
    insert(45);
  };

  const runTest3 = async () => {
    clearTable();
    setStrategy('double');
    resize(10);
    await new Promise(r => setTimeout(r, 100));
    
    // Insert 15, 25, 35
    insert(15);
    await new Promise(r => setTimeout(r, 1000));
    insert(25);
    await new Promise(r => setTimeout(r, 1500));
    insert(35);
  };

  return (
    <div className="glass-card p-3 flex flex-col gap-2">
      <h3 className="text-xs font-bold" style={{ color: 'var(--color-neon-purple)', fontFamily: 'var(--font-mono)' }}>
        TEST SCENARIOS
      </h3>
      <div className="flex flex-col gap-1.5">
        <button 
          className="btn-ghost text-[10px] text-left px-2 py-1.5"
          onClick={runTest1}
        >
          🧪 Test 1: Chaining Deletion
        </button>
        <button 
          className="btn-ghost text-[10px] text-left px-2 py-1.5"
          onClick={runTest2}
        >
          🧪 Test 2: Linear Tombstones
        </button>
        <button 
          className="btn-ghost text-[10px] text-left px-2 py-1.5"
          onClick={runTest3}
        >
          🧪 Test 3: Double Hashing
        </button>
      </div>
    </div>
  );
}
