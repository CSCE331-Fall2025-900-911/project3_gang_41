import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, ReceiptText } from "lucide-react";

// ----- Types based on your Express GET -----
type ApiOrderItem = {
  name: string;
  qty: number | string;    // can be string from PG
  price: number | string;  // line total (qty * unit), likely numeric->string
};

type ApiOrder = {
  orderid: number;
  customerid: number | null;
  orderdate: string;               // "YYYY-MM-DD HH:mm:ss"
  employeeatcheckout: number | null;
  paymentmethod: string | null;
  total_order_price: number | string; // numeric -> string
  items: ApiOrderItem[];
};

type ApiResponse = {
  orders: ApiOrder[];
  totalPages: number;
  currentPage: number;
};

// ----- Display types -----
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
  subtotal: number; // pre-tax
  tax: number;
  total: number;
  itemCount: number;
};

// ----- Constants -----
const PAGE_SIZE = 20;
const TAX_RATE = 0.0825;

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const parsePgTimestamp = (ts: string) => {
  // "YYYY-MM-DD HH:mm:ss" -> local Date
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

function HistoryPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const hasMore = page < totalPages;

  const load = async (targetPage = 1) => {
    try {
      setLoading(true);
      setError(null);

      const url = `${API_URL}/api/order-history?page=${targetPage}&limit=${PAGE_SIZE}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load orders");
      const data: ApiResponse = await res.json();

      const normalized = (data.orders ?? []).map(normalizeOrder);
      setOrders((prev) => (targetPage === 1 ? normalized : [...prev, ...normalized]));
      setTotalPages(data.totalPages || 1);
    } catch (e: any) {
      setError(e?.message ?? "Unable to load orders");
      toast.error("Failed to load order history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const loadMore = async () => {
    const next = page + 1;
    setPage(next);
    await load(next);
  };

  const toggleExpand = (id: number) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b">
          <div className="flex h-16 items-center px-6 justify-between">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              <h1 className="text-2xl font-bold">Order History</h1>
            </div>
            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading && orders.length === 0 ? (
            <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading orders...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => load(page)}>
                Retry
              </Button>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center text-muted-foreground">No orders yet.</div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => {
                const isOpen = !!expanded[o.id];
                return (
                  <Card key={o.id}>
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg">Order #{o.id}</CardTitle>
                          <div className="text-xs text-muted-foreground mt-1">
                            {o.date.toLocaleString()} • {o.itemCount}{" "}
                            {o.itemCount === 1 ? "item" : "items"} •{" "}
                            {o.customerId && o.customerId !== 0
                              ? `Customer #${o.customerId}`
                              : "Guest"}
                            {o.employeeId != null ? ` • Cashier #${o.employeeId}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">
                            {o.paymentMethod || "unknown"}
                          </Badge>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Total</div>
                            <div className="text-lg font-bold">{currency(o.total)}</div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    {isOpen && (
                      <CardContent className="p-4 pt-0 space-y-3">
                        {o.items.map((it, idx) => (
                          <div
                            key={`${o.id}-${idx}`}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{it.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ×{it.qty}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                @ {currency(it.unitPrice)}
                              </span>
                            </div>
                            <span className="font-medium">
                              {currency(it.lineTotal)}
                            </span>
                          </div>
                        ))}

                        <Separator />

                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal</span>
                            <span>{currency(o.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Tax (8.25%)</span>
                            <span>{currency(o.tax)}</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Total</span>
                            <span>{currency(o.total)}</span>
                          </div>
                        </div>
                      </CardContent>
                    )}

                    <CardFooter className="p-4 pt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => toggleExpand(o.id)}
                      >
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        {isOpen ? "Hide items" : "View items"}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}

              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={loadMore} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryPage;