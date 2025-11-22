import React, { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Loader2, ReceiptText, Search, X } from "lucide-react";
import { TAX_RATE } from "@project3/shared";

// ... (Types and Constants remain exactly the same) ...
type ApiOrderItem = {
  name: string;
  qty: number | string;
  price: number | string;
};

type ApiOrder = {
  orderid: number;
  customerid: number | null;
  orderdate: string;
  employeeatcheckout: number | null;
  paymentmethod: string | null;
  total_order_price: number | string;
  items: ApiOrderItem[];
};

type ApiResponse = {
  orders: ApiOrder[];
  totalPages: number;
  currentPage: number;
};

type Order = {
  id: number;
  date: Date;
  customerId: number | null;
  employeeId: number | null;
  paymentMethod: string;
  items: {
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
};

const PAGE_SIZE = 20;

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const parsePgTimestamp = (ts: string) => {
  const [d, t] = ts.split(" ");
  if (!d || !t) return new Date(ts);
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm, ss] = t.split(":").map(Number);
  return new Date(y, (m || 1) - 1, day || 1, hh || 0, mm || 0, ss || 0);
};

const normalizeOrder = (o: ApiOrder): Order => {
  const subtotal =
    typeof o.total_order_price === "string"
      ? parseFloat(o.total_order_price)
      : o.total_order_price || 0;

  const items = (o.items ?? []).map((it) => {
    const qty =
      typeof it.qty === "string" ? parseInt(it.qty, 10) : Number(it.qty || 0);
    const lineTotal =
      typeof it.price === "string" ? parseFloat(it.price) : Number(it.price || 0);
    const unitPrice = qty > 0 ? lineTotal / qty : 0;
    return { name: it.name, qty, unitPrice, lineTotal };
  });

  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const itemCount = items.reduce((s, i) => s + i.qty, 0);

  return {
    id: o.orderid,
    date: parsePgTimestamp(o.orderdate),
    customerId: o.customerid ?? null,
    employeeId: o.employeeatcheckout ?? null,
    paymentMethod: (o.paymentmethod || "unknown").toString(),
    items,
    subtotal,
    tax,
    total,
    itemCount,
  };
};

export default function HistoryPage() {
  // Removed { user } from useAuth() since it is no longer used in UI
  const { } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  
  const [searchId, setSearchId] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const hasMore = page < totalPages;

  const load = async (targetPage = 1, searchTerm = "") => {
    try {
      setLoading(true);
      setError(null);

      let url = `${API_URL}/api/order-history?page=${targetPage}&limit=${PAGE_SIZE}`;
      if (searchTerm.trim()) {
        url += `&id=${encodeURIComponent(searchTerm.trim())}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load orders");
      const data: ApiResponse = await res.json();

      const normalized = (data.orders ?? []).map(normalizeOrder);

      setOrders((prev) => (targetPage === 1 ? normalized : [...prev, ...normalized]));
      setTotalPages(data.totalPages || 1);
      
      setIsSearching(!!searchTerm.trim());
    } catch (e: any) {
      console.error("Load error:", e);
      setError(e?.message ?? "Unable to load orders");
      toast.error("Failed to load order history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, "");
  }, []);

  const loadMore = async () => {
    const next = page + 1;
    setPage(next);
    await load(next, searchId);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, searchId);
  };

  const clearSearch = () => {
    setSearchId("");
    setPage(1);
    load(1, "");
  };

  const toggleExpand = (id: number) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));


  return (
    <div className="flex h-full bg-background flex-col overflow-hidden">
      
      {/* Header - Fixed height */}
      <div className="border-b bg-white flex-none">
        <div className="flex h-16 items-center px-6 justify-between gap-4">
          <div className="flex items-center gap-2 min-w-fit">
            <ReceiptText className="h-5 w-5" />
            <h1 className="text-2xl font-bold hidden md:block">Order History</h1>
            <h1 className="text-xl font-bold md:hidden">Orders</h1>
          </div>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md flex items-center gap-2 ml-auto">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Search by Order ID..."
                className="pl-9"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
              {searchId && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" disabled={loading}>
              Search
            </Button>
          </form>
          
          {/* Removed User Profile section from here */}
        </div>
      </div>

      {/* Content - Scrollable area */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
        {loading && page === 1 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading orders...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center h-full">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => load(1, searchId)}>
              Retry
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <ReceiptText className="h-10 w-10 opacity-20" />
            <p>
              {isSearching 
                ? `No order found with ID #${searchId}` 
                : "No order history available."}
            </p>
            {isSearching && (
              <Button variant="link" onClick={clearSearch}>
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-w-5xl mx-auto pb-6">
            {orders.map((o) => {
              const isOpen = !!expanded[o.id];
              return (
                <Card key={o.id} className="overflow-hidden flex-none">
                  <CardHeader className="p-4 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">Order #{o.id}</CardTitle>
                          <Badge variant="outline" className="font-normal text-xs">
                            {o.paymentMethod || "unknown"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span>{o.date.toLocaleString()}</span>
                          <span>•</span>
                          <span>
                            {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                          </span>
                          <span>•</span>
                          <span>
                            {o.customerId && o.customerId !== 0
                              ? `Customer #${o.customerId}`
                              : "Guest"}
                          </span>
                          {o.employeeId != null && (
                            <>
                              <span>•</span>
                              <span>Cashier #{o.employeeId}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:text-right">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total</div>
                          <div className="text-xl font-bold text-primary">
                            {currency(o.total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <div 
                    className="px-4 py-2 bg-slate-50 border-t border-b flex justify-center cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleExpand(o.id)}
                  >
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      {isOpen ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          View Details
                        </>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <CardContent className="p-0 bg-slate-50/50 animate-in slide-in-from-top-1 duration-200">
                      <div className="divide-y border-b">
                        {o.items.map((it, idx) => (
                          <div
                            key={`${o.id}-${idx}`}
                            className="flex items-center justify-between p-4 hover:bg-white transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                                {it.qty}x
                              </div>
                              <div>
                                <div className="font-medium text-sm">{it.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  @ {currency(it.unitPrice)} each
                                </div>
                              </div>
                            </div>
                            <div className="font-medium text-sm">
                              {currency(it.lineTotal)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 bg-white space-y-1.5">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Subtotal</span>
                          <span>{currency(o.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Tax ({(TAX_RATE * 100).toFixed(2)}%)</span>
                          <span>{currency(o.tax)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold pt-2 border-t mt-2">
                          <span>Total</span>
                          <span>{currency(o.total)}</span>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {hasMore && (
              <div className="flex justify-center pt-4 pb-8">
                <Button variant="secondary" onClick={loadMore} disabled={loading} className="min-w-[150px]">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Load More Orders
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}