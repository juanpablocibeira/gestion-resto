"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductGrid } from "@/components/orders/product-grid";
import { useOrderStore } from "@/stores/orderStore";
import { Send, Minus, Plus, Trash2, ArrowLeft, Receipt } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface TableDetail {
  id: string;
  label: string;
  seats: number;
  sessions: {
    id: string;
    status: string;
    guests: number;
    waiter: { name: string };
    orders: {
      id: string;
      orderNumber: number;
      status: string;
      items: {
        id: string;
        quantity: number;
        unitPrice: number;
        notes?: string;
        status: string;
        product: { name: string };
      }[];
    }[];
  }[];
}

interface Product {
  id: string;
  name: string;
  price: number;
  available: boolean;
  category: { id: string; name: string };
  imageUrl?: string | null;
}

interface Category {
  id: string;
  name: string;
}

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.tableId as string;
  const [table, setTable] = useState<TableDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [sending, setSending] = useState(false);

  const { items, addItem, removeItem, updateQuantity, updateItemNotes, notes, setNotes, clear, total } = useOrderStore();

  const fetchTable = useCallback(async () => {
    const res = await fetch(`/api/tables/${tableId}`);
    if (res.ok) setTable(await res.json());
  }, [tableId]);

  const fetchProducts = useCallback(async () => {
    const res = await fetch("/api/products");
    if (res.ok) {
      const data = await res.json();
      setProducts(data.filter((p: Product) => p.available));
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (res.ok) setCategories(await res.json());
  }, []);

  useEffect(() => {
    fetchTable();
    fetchProducts();
    fetchCategories();
  }, [fetchTable, fetchProducts, fetchCategories]);

  const session = table?.sessions[0];
  const filteredProducts = activeCategory === "all"
    ? products
    : products.filter((p) => p.category.id === activeCategory);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(price);

  async function handleSendOrder() {
    if (!session || items.length === 0) return;
    setSending(true);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          notes: i.notes,
        })),
        notes: notes || undefined,
      }),
    });

    setSending(false);
    if (res.ok) {
      toast.success("Pedido enviado a cocina");
      clear();
      fetchTable();
    } else {
      toast.error("Error al enviar pedido");
    }
  }

  if (!table) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/floor">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold">Mesa {table.label}</h2>
          {session && (
            <p className="text-sm text-muted-foreground">
              {session.guests} comensales · {session.waiter.name}
            </p>
          )}
        </div>
        {session && (
          <Link href={`/billing/${tableId}`} className="ml-auto">
            <Button variant="outline" className="h-10 gap-2">
              <Receipt className="h-4 w-4" />
              Cuenta
            </Button>
          </Link>
        )}
      </div>

      {!session ? (
        <p className="text-center text-muted-foreground py-8">Esta mesa no tiene sesion activa</p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Product selection */}
          <div className="flex-1">
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="flex flex-wrap h-auto gap-1 mb-3">
                <TabsTrigger value="all" className="h-9">Todos</TabsTrigger>
                {categories.map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id} className="h-9">{cat.name}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <ProductGrid
              products={filteredProducts}
              onSelect={(p) => addItem({ id: p.id, name: p.name, price: p.price })}
            />
          </div>

          {/* Order builder */}
          <Card className="w-full lg:w-96 shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nuevo Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScrollArea className="max-h-[400px]">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Toca productos para agregar
                  </p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.productId} className="flex items-center gap-2 p-2 border rounded-md">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">{formatPrice(item.unitPrice)} c/u</p>
                          <Input
                            placeholder="Notas..."
                            value={item.notes || ""}
                            onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                            className="h-7 text-xs mt-1"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.productId)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {items.length > 0 && (
                <>
                  <Input
                    placeholder="Notas del pedido..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-10"
                  />
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(total())}</span>
                  </div>
                  <Button onClick={handleSendOrder} className="w-full h-12 text-base gap-2" disabled={sending}>
                    <Send className="h-4 w-4" />
                    {sending ? "Enviando..." : "Enviar a Cocina"}
                  </Button>
                </>
              )}

              {/* Previous orders */}
              {session.orders.length > 0 && (
                <>
                  <Separator />
                  <p className="text-sm font-medium">Pedidos anteriores</p>
                  {session.orders.map((order) => (
                    <div key={order.id} className="border rounded-md p-2 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Pedido #{order.orderNumber}</span>
                        <Badge variant={order.status === "DELIVERED" ? "default" : "secondary"}>
                          {order.status}
                        </Badge>
                      </div>
                      {order.items.map((item) => (
                        <p key={item.id} className="text-xs text-muted-foreground">
                          {item.quantity}x {item.product.name} - {formatPrice(item.unitPrice * item.quantity)}
                          {item.notes && <span className="italic"> ({item.notes})</span>}
                        </p>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
