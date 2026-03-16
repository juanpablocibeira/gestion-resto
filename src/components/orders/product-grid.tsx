"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  available: boolean;
  category: { name: string };
  imageUrl?: string | null;
}

interface ProductGridProps {
  products: Product[];
  onSelect?: (product: Product) => void;
  selectedIds?: string[];
}

export function ProductGrid({ products, onSelect, selectedIds = [] }: ProductGridProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {products.map((product) => (
        <Card
          key={product.id}
          className={cn(
            "cursor-pointer transition-all active:scale-95 touch-manipulation select-none",
            !product.available && "opacity-50",
            selectedIds.includes(product.id) && "ring-2 ring-primary"
          )}
          onClick={() => product.available && onSelect?.(product)}
        >
          <CardContent className="p-3 flex flex-col gap-1 min-h-[100px] justify-between">
            <div>
              <p className="font-medium text-sm leading-tight line-clamp-2">
                {product.name}
              </p>
              <Badge variant="secondary" className="text-xs mt-1">
                {product.category.name}
              </Badge>
            </div>
            <p className="text-base font-bold text-primary">
              {formatPrice(product.price)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
