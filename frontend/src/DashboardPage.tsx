import { useEffect, useState } from "react"
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { fetchApi } from "@/lib/api"
import { 
  Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, 
  LabelList, Pie, PieChart, Cell, Tooltip
} from "recharts"
import {
  DollarSign, Users, CreditCard, Activity, Download, TrendingUp, 
  TrendingDown, AlertTriangle, AlertOctagon, CheckCircle2, Clock, Zap, Receipt
} from "lucide-react"

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, 
  ChartLegend, ChartLegendContent
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardData } from "@project3/shared";

// Extend type locally if needed for specific props not in shared
type ExtendedDashboardData = DashboardData & {
  topItems?: Array<{ name: string; value: number }>;
};

// NOTE: Updated to match backend: order_time_label instead of raw orderdate
interface RecentOrder {
  orderid: number;
  total_order_price: number;
  paymentmethod: string;
  order_time_label: string; // e.g. "08:33 PM" in business timezone
}

// Chart Configs
const revenueConfig = {
  revenue: { label: "Revenue ($)", color: "hsl(var(--chart-1))" },
  order_count: { label: "Orders (#)", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

const categoryConfig = {
  value: { label: "Sales ($)", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig

const pieConfig = {
  value: { label: "Orders", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function DashboardPage() {
  const [data, setData] = useState<ExtendedDashboardData | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("today");
  const [thresholds] = useLocalStorage('inventory.thresholds', { warn: 10, crit: 5 });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        // Fetch both endpoints in parallel
        const [stats, history] = await Promise.all([
          fetchApi<DashboardData>(`/api/reports/dashboard?range=${timeRange}`),
          fetchApi<{ orders: RecentOrder[] }>('/api/order-history?limit=5')
        ]);
        setData(stats);
        setRecentOrders(history.orders || []);
      } catch (error) {
        console.error("Failed to load dashboard", error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [timeRange]);

  if (loading) return <DashboardSkeleton />;
  if (!data) return <div className="p-8 text-destructive">Error loading data.</div>;

  const { kpi, trend, categorySales, paymentMethods, lowStock } = data;

  // Ensure numbers are safe
  const totalRevenue = Number(kpi?.total_revenue || 0);
  const totalOrders = Number(kpi?.total_orders || 0);
  const activeStaff = Number(kpi?.active_staff || 0);
  const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
  const revPerStaff = activeStaff > 0 ? (totalRevenue / activeStaff) : 0;

  // Find peak hour
  const peakHourData = [...(trend || [])].sort((a, b) => Number(b.revenue) - Number(a.revenue))[0];
  const peakHourLabel = peakHourData ? peakHourData.time_label : "N/A";
  const peakHourValue = peakHourData ? Number(peakHourData.revenue) : 0;

  // Filter alerts
  const activeAlerts = (lowStock || [])
    .map(item => {
      if (item.supply <= thresholds.crit) return { ...item, status: 'critical' };
      if (item.supply <= thresholds.warn) return { ...item, status: 'warning' };
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.supply - b.supply)
    .slice(0, 5);

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">Store performance overview</p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={timeRange} onValueChange={setTimeRange}>
              <TabsList>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard title="Total Revenue" icon={DollarSign} value={`$${totalRevenue.toFixed(2)}`} sub="Gross sales" good />
          <KpiCard title="Total Orders" icon={CreditCard} value={totalOrders} sub="Transactions" good />
          <KpiCard title="Avg Order Value" icon={Activity} value={`$${avgOrderValue.toFixed(2)}`} sub="Per order" good={avgOrderValue > 10} />
          <KpiCard title="Active Staff" icon={Users} value={activeStaff} sub="Clocked in" good />
          <KpiCard title="Efficiency" icon={Zap} value={`$${revPerStaff.toFixed(0)}`} sub="Rev/Staff" good={revPerStaff > 100} />
          <KpiCard title="Peak Time" icon={Clock} value={peakHourLabel} sub={`$${peakHourValue.toFixed(0)} revenue`} good />
        </div>

        {/* Main Charts */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Trend */}
          <Card className="col-span-4 border-none shadow-md">
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
              <CardDescription>Revenue over time</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              <ChartContainer config={revenueConfig} className="h-[300px] w-full">
                <AreaChart data={trend} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.4} />
                  <XAxis dataKey="time_label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis orientation="left" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fill="url(#fillRevenue)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Category Sales */}
          <Card className="col-span-3 border-none shadow-md">
            <CardHeader>
              <CardTitle>Category Sales</CardTitle>
              <CardDescription>Top performing categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={categoryConfig} className="h-[300px] w-full">
                <BarChart data={categorySales} layout="vertical" margin={{ left: 0 }}>
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={100} fontSize={12} />
                  <XAxis type="number" hide />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={4} barSize={20}>
                    <LabelList dataKey="value" position="right" formatter={(v:number) => `$${v}`} className="fill-foreground text-xs" />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Recent Transactions */}
          <Card className="col-span-4 border-none shadow-md">
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Live transaction feed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.length > 0 ? recentOrders.map((order) => (
                  <div key={order.orderid} className="flex items-center justify-between p-2 hover:bg-muted/40 rounded-lg transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={`https://api.dicebear.com/7.x/identicon/svg?seed=${order.orderid}`} />
                        <AvatarFallback><Receipt className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">Order #{order.orderid}</p>
                        {/* NOTE: Use preformatted local time label from backend */}
                        <p className="text-xs text-muted-foreground">
                          {order.order_time_label}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="capitalize mb-1">{order.paymentmethod}</Badge>
                      <div className="font-bold text-sm">${Number(order.total_order_price).toFixed(2)}</div>
                    </div>
                  </div>
                )) : <div className="text-center py-8 text-muted-foreground">No recent orders</div>}
              </div>
            </CardContent>
          </Card>

          {/* Operations / Stock */}
          <Card className="col-span-3 border-none shadow-md">
            <CardHeader>
              <CardTitle>Operations</CardTitle>
              <CardDescription>Stock Alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {activeAlerts.length > 0 ? (
                <div className="space-y-2">
                  {activeAlerts.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-background p-2 rounded border">
                      {item.status === 'critical' 
                        ? <AlertOctagon className="h-4 w-4 text-red-500 animate-pulse" /> 
                        : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      <div className="flex-1 flex justify-between">
                        <span className="text-sm font-medium">{item.item_name}</span>
                        <span className="text-xs text-muted-foreground">{item.supply} {item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-4 rounded-lg">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Inventory Healthy</span>
                </div>
              )}
              
              {/* Payment Pie Chart */}
              <div className="h-[150px] mt-4">
                <ChartContainer config={pieConfig} className="h-full w-full">
                  <PieChart>
                    <Pie data={paymentMethods} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                      {paymentMethods?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <ChartLegend content={<ChartLegendContent />} className="-translate-y-2" />
                  </PieChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, icon: Icon, value, sub, good }: any) {
  return (
    <Card className="border-none shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs flex items-center mt-1 text-muted-foreground">
          {good ? <TrendingUp className="mr-1 h-3 w-3 text-emerald-500" /> : <TrendingDown className="mr-1 h-3 w-3 text-rose-500" />}
          {sub}
        </p>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between"><Skeleton className="h-8 w-[200px]" /><Skeleton className="h-8 w-[100px]" /></div>
      <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-[120px]" /><Skeleton className="h-[120px]" /><Skeleton className="h-[120px]" /></div>
      <Skeleton className="h-[300px]" />
    </div>
  )
}