import { create } from "zustand";

export interface OrderItemDraft {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

interface OrderStore {
  items: OrderItemDraft[];
  notes: string;
  addItem: (product: { id: string; name: string; price: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemNotes: (productId: string, notes: string) => void;
  setNotes: (notes: string) => void;
  clear: () => void;
  total: () => number;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  items: [],
  notes: "",
  addItem: (product) => {
    const existing = get().items.find((i) => i.productId === product.id);
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      set({
        items: [
          ...get().items,
          {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitPrice: product.price,
          },
        ],
      });
    }
  },
  removeItem: (productId) => {
    set({ items: get().items.filter((i) => i.productId !== productId) });
  },
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      set({ items: get().items.filter((i) => i.productId !== productId) });
    } else {
      set({
        items: get().items.map((i) =>
          i.productId === productId ? { ...i, quantity } : i
        ),
      });
    }
  },
  updateItemNotes: (productId, notes) => {
    set({
      items: get().items.map((i) =>
        i.productId === productId ? { ...i, notes } : i
      ),
    });
  },
  setNotes: (notes) => set({ notes }),
  clear: () => set({ items: [], notes: "" }),
  total: () => get().items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0),
}));
