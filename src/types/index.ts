export type TableStatus = "free" | "occupied" | "waiting_food" | "waiting_bill";

export interface FloorTableView {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: "RECTANGLE" | "CIRCLE" | "SQUARE";
  seats: number;
  status: TableStatus;
  sessionId?: string;
  waiterName?: string;
  guests?: number;
}

export interface KitchenOrderView {
  id: string;
  orderNumber: number;
  tableLabel: string;
  waiterName: string;
  status: string;
  notes?: string;
  createdAt: string;
  items: {
    id: string;
    productName: string;
    quantity: number;
    notes?: string;
    status: string;
  }[];
}
