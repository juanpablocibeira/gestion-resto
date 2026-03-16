import { create } from "zustand";

interface TableDraft {
  id?: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: "RECTANGLE" | "CIRCLE" | "SQUARE";
  seats: number;
}

interface FloorEditorStore {
  tables: TableDraft[];
  selectedId: string | null;
  setTables: (tables: TableDraft[]) => void;
  addTable: (table: TableDraft) => void;
  updateTable: (index: number, updates: Partial<TableDraft>) => void;
  removeTable: (index: number) => void;
  selectTable: (id: string | null) => void;
  getSelected: () => TableDraft | null;
}

export const useFloorEditorStore = create<FloorEditorStore>((set, get) => ({
  tables: [],
  selectedId: null,
  setTables: (tables) => set({ tables }),
  addTable: (table) => set({ tables: [...get().tables, table] }),
  updateTable: (index, updates) => {
    const tables = [...get().tables];
    tables[index] = { ...tables[index], ...updates };
    set({ tables });
  },
  removeTable: (index) => {
    const tables = get().tables.filter((_, i) => i !== index);
    set({ tables, selectedId: null });
  },
  selectTable: (id) => set({ selectedId: id }),
  getSelected: () => {
    const { tables, selectedId } = get();
    if (selectedId === null) return null;
    return tables.find((t) => (t.id || String(tables.indexOf(t))) === selectedId) || null;
  },
}));
