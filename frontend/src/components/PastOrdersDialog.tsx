import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, ShoppingBag, Star, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
// UPDATED: Shared types and ID gen
import { type CartItem, type MenuItem, generateCartItemId } from "@project3/shared";

interface PastOrder {
  orderid: number;
  order_date: string;
  total_price: number;
  items: { name: string; qty: number; id?: number }[];
}

interface PastOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
  onReorder: (items: any[]) => void;
}

export function PastOrdersDialog({ open, onOpenChange, customerId, onReorder }: PastOrdersDialogProps) {
  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuMap, setMenuMap] = useState<Map<string, MenuItem>>(new Map());

  // 1. Fetch Menu Data once to map names to IDs/Prices for reordering
  useEffect(() => {
    if (open) {
      fetchApi<MenuItem[]>('/api/menu').then(items => {
        const map = new Map();
        items.forEach(i => {
            const safeItem = { 
                ...i, 
                cost: parseFloat(String(i.cost)) 
            };
            map.set(i.item_name, safeItem);
        });
        setMenuMap(map);
      }).catch(console.error);
    }
  }, [open]);

  // 2. Fetch History
  useEffect(() => {
    if (open && customerId) {
      setLoading(true);
      fetchApi<PastOrder[]>(`/api/customers/${customerId}/orders`)
        .then((data) => setOrders(data))
        .catch((err) => console.error(err))
        .finally(() => setTimeout(() => setLoading(false), 400));
    }
  }, [open, customerId]);

  const handleReorderClick = (order: PastOrder) => {
    const cartItems: CartItem[] = [];
    
    order.items.forEach(histItem => {
      const menuItem = menuMap.get(histItem.name);
      if (menuItem) {
        cartItems.push({
          item_id: menuItem.item_id,
          item_name: menuItem.item_name,
          cost: Number(menuItem.cost), 
          quantity: histItem.qty,
          // UPDATED: Use Shared ID + Timestamp
          uniqueId: `${generateCartItemId(menuItem.item_id)}-${Date.now()}-${Math.random()}`,
        });
      }
    });

    onReorder(cartItems);
    onOpenChange(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Order History
          </DialogTitle>
          <DialogDescription>
            Select an order to quickly add it to your cart.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden mt-2">
          {loading ? (
            <div className="space-y-4 pr-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground gap-2">
              <ShoppingBag className="h-10 w-10 opacity-20" />
              <p>No past orders found.</p>
            </div>
          ) : (
            <ScrollArea className="h-[55vh] pr-4">
              <div className="space-y-4 p-1">
                {orders.map((order) => {
                    const pointsEarned = Math.floor(Number(order.total_price) * 10);
                    
                    return (
                        <div 
                          key={order.orderid} 
                          // ADDED: Hover effects restored (border color, shadow, translate)
                          className="border rounded-xl p-4 bg-white shadow-sm border-slate-200 transition-all duration-200 hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-3 border-b pb-2 border-dashed">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(order.order_date)}
                                </div>
                                <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                    #{order.orderid}
                                </div>
                            </div>
                            
                            {/* Items */}
                            <div className="space-y-2 mb-4">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm items-center">
                                      <span className="truncate pr-2 font-medium">{item.name}</span>
                                      <Badge variant="secondary" className="h-5 px-1.5 min-w-[2rem] justify-center shrink-0">
                                          x{item.qty}
                                      </Badge>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-2 border-t mt-2">
                                {/* Points */}
                                <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                    <Star className="h-3 w-3 fill-current" />
                                    +{pointsEarned}
                                </div>

                                {/* Reorder Button */}
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-8 text-xs gap-1 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                  onClick={() => handleReorderClick(order)}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  Order Again
                                </Button>

                                {/* Price */}
                                <div className="font-bold text-lg">
                                    {formatCurrency(Number(order.total_price))}
                                </div>
                            </div>
                        </div>
                    );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}