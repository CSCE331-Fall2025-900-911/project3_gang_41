import { useEffect, useState, lazy, Suspense } from "react"
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { fetchApi } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import {
  Area, Bar, CartesianGrid, XAxis, YAxis,
  LabelList, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from "recharts"

const LazyAreaChart = lazy(() => import('recharts').then(module => ({ default: module.AreaChart })));
const LazyBarChart = lazy(() => import('recharts').then(module => ({ default: module.BarChart })));
const LazyPieChart = lazy(() => import('recharts').then(module => ({ default: module.PieChart })));

import {
  DollarSign, Users, CreditCard, Activity, Download, TrendingUp,
  AlertTriangle, AlertOctagon, CheckCircle2, Clock, Zap, Receipt,
  ArrowUp, ArrowDown, RefreshCw, Calendar, BarChart3, PieChart, ShoppingCart,
  Package, Sparkles, Minus
} from "lucide-react"

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { DashboardData } from "@project3/shared";

// Type definitions
type ExtendedDashboardData = DashboardData & {
  topItems?: Array<{ name: string; value: number }>;
};

interface RecentOrder {
  orderid: number;
  total_order_price: number;
  paymentmethod: string;
  order_time_label: string;
}

// Enhanced chart configs
const revenueConfig = {
  revenue: { label: "Revenue ($)", color: "hsl(var(--primary))" },
  order_count: { label: "Orders (#)", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

const categoryConfig = {
  value: { label: "Sales ($)", color: "hsl(var(--primary))" },
} satisfies ChartConfig

// Vibrant, accessible colors
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4'];

// Payment method icons mapping
const paymentIcons: Record<string, React.FC<{ className?: string }>> = {
  cash: DollarSign,
  card: CreditCard,
  mobile: Activity,
};

// Animation styles as a constant
const slideInAnimation = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export default function DashboardPage() {
  const [data, setData] = useState<ExtendedDashboardData | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("today");
  const [thresholds] = useLocalStorage('inventory.thresholds', { warn: 10, crit: 5 });

  const loadDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      const [stats, history] = await Promise.all([
        fetchApi<DashboardData>(`/api/reports/dashboard?range=${timeRange}`),
        fetchApi<{ orders: RecentOrder[] }>('/api/order-history?limit=5&mode=dashboard')
      ]);
      setData(stats);
      setRecentOrders(history.orders || []);
    } catch (error) {
      console.error("Failed to load dashboard", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [timeRange]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => loadDashboard(true), 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  if (loading) return <EnhancedDashboardSkeleton />;
  if (!data) return <ErrorState onRetry={() => loadDashboard()} />;

  const { kpi, trend, categorySales, paymentMethods, lowStock } = data;

  // --- KPI Extraction ---
  const totalRevenue = Number(kpi?.total_revenue || 0);
  const totalOrders = Number(kpi?.total_orders || 0);
  const activeStaff = Number(kpi?.active_staff || 0);

  // Standard Trends
  const revTrend = kpi?.revenue_percent_change ?? 0;
  const ordTrend = kpi?.orders_percent_change ?? 0;
  const aovTrend = kpi?.avg_order_value_percent_change ?? 0;
  const effTrend = kpi?.efficiency_percent_change ?? 0;

  // Pacing Trends
  const revPacing = kpi?.revenue_pacing_change ?? 0;
  const ordPacing = kpi?.orders_pacing_change ?? 0;

  // Previous Values
  const prevRevTotal = kpi?.prev_revenue_total ?? 0;
  const prevRevPaced = kpi?.prev_revenue_paced ?? 0;
  const prevOrdTotal = kpi?.prev_orders_total ?? 0;
  const prevOrdPaced = kpi?.prev_orders_paced ?? 0;
  const prevAov = kpi?.prev_avg_order_value ?? 0;
  const prevEff = kpi?.prev_efficiency ?? 0;

  // Calculated AOV/Eff for display
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const revPerStaff = activeStaff > 0 ? totalRevenue / activeStaff : 0;

  // Peak Info
  const peakLabel = kpi?.peak_time_label || "N/A";
  const prevPeakLabel = kpi?.prev_peak_time_label || "N/A";

  // const peakHourData = [...(trend || [])].sort((a, b) => Number(b.revenue) - Number(a.revenue))[0];
  // const peakHourValue = peakHourData ? Number(peakHourData.revenue) : 0;

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
    <>
      <style>{slideInAnimation}</style>
      <div className="h-full w-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1800px] mx-auto">
          {/* Enhanced Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                  Dashboard
                </h2>
                {refreshing && (
                  <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
                )}
              </div>
              <p className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Tabs value={timeRange} onValueChange={setTimeRange} className="w-fit">
                <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800">
                  <TabsTrigger value="today" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                    Today
                  </TabsTrigger>
                  <TabsTrigger value="week" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                    Week
                  </TabsTrigger>
                  <TabsTrigger value="month" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                    Month
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
                onClick={() => loadDashboard(true)}
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <Button size="sm" className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Enhanced KPI Cards */}
          {/* KPI GRID: Changed to 4 columns on XL to fit 8 cards nicely */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            
            {/* 1. Total Revenue (Standard) */}
            <EnhancedKpiCard
              title="Total Revenue"
              icon={DollarSign}
              value={formatCurrency(totalRevenue)}
              sub="Gross sales"
              trend={revTrend}
              previousValue={formatCurrency(prevRevTotal)}
              color="emerald"
            />

            {/* 2. Revenue Pacing (NEW) */}
            <EnhancedKpiCard
              title="Revenue Velocity"
              icon={Activity}
              value={formatCurrency(totalRevenue)}
              sub="At this time"
              trend={revPacing}
              previousValue={formatCurrency(prevRevPaced)}
              color="blue"
            />

            {/* 3. Total Orders (Standard) */}
            <EnhancedKpiCard
              title="Total Orders"
              icon={ShoppingCart}
              value={totalOrders.toLocaleString()}
              sub="Transactions"
              trend={ordTrend}
              previousValue={prevOrdTotal.toLocaleString()}
              color="purple"
            />

            {/* 4. Order Pacing (NEW) */}
            <EnhancedKpiCard
              title="Order Velocity"
              icon={Zap}
              value={totalOrders.toLocaleString()}
              sub="At this time"
              trend={ordPacing}
              previousValue={prevOrdPaced.toLocaleString()}
              color="cyan"
            />

            {/* 5. Avg Order Value */}
            <EnhancedKpiCard
              title="Avg Order Value"
              icon={CreditCard}
              value={formatCurrency(avgOrderValue)}
              sub="Per order"
              trend={aovTrend}
              previousValue={formatCurrency(prevAov)}
              color="orange"
            />

            {/* 6. Active Staff (Badge Removed) */}
            <EnhancedKpiCard
              title="Total Unique Staff"
              icon={Users}
              value={activeStaff}
              sub="Clocked in today"
              trend={undefined} // Hide badge
              previousValue={undefined}
              color="pink"
            />

            {/* 7. Efficiency */}
            <EnhancedKpiCard
              title="Efficiency"
              icon={BarChart3}
              value={`$${revPerStaff.toFixed(0)}`}
              sub="Rev/Staff"
              trend={effTrend}
              previousValue={`$${prevEff.toFixed(0)}`}
              color="emerald"
            />

            {/* 8. Peak Time (Comparison Label Only) */}
            <EnhancedKpiCard
              title="Peak Time"
              icon={Clock}
              value={peakLabel}
              sub="Busiest period"
              previousValue={`vs ${prevPeakLabel}`}
              trend={undefined} // Hide badge
              color="blue"
            />

          </div>

          {/* Main Charts Row */}
          <div className="grid gap-4 lg:grid-cols-7">
            {/* Enhanced Trend Chart */}
            <Card className="col-span-full lg:col-span-4 border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Sales Trend
                    </CardTitle>
                    <CardDescription>Revenue performance over time</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pl-0 pr-2">
                <Suspense fallback={<ChartSkeleton />}>
                  <ChartContainer config={revenueConfig} className="h-[320px] w-full">
                    <LazyAreaChart data={trend} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillRevenueEnhanced" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis 
                        dataKey="time_label" 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={8}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis 
                        orientation="left" 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                        tick={{ fontSize: 11 }}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />} 
                        cursor={{ strokeDasharray: '3 3' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        fill="url(#fillRevenueEnhanced)" 
                        strokeWidth={2.5}
                        animationDuration={1000}
                        dot={{ fill: 'hsl(var(--primary))', r: 0 }}
                        activeDot={{ r: 4 }}
                      />
                    </LazyAreaChart>
                  </ChartContainer>
                </Suspense>
              </CardContent>
            </Card>

            {/* Enhanced Category Sales */}
            <Card className="col-span-full lg:col-span-3 border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur">
              <CardHeader className="pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    Category Performance
                  </CardTitle>
                  <CardDescription>Top selling categories</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ChartSkeleton />}>
                  <ChartContainer config={categoryConfig} className="h-[320px] w-full">
                    <LazyBarChart data={categorySales} layout="vertical" margin={{ left: 0, right: 40 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tickLine={false} 
                        axisLine={false} 
                        width={80} 
                        tick={{ fontSize: 11 }}
                      />
                      <XAxis type="number" hide />
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Bar 
                        dataKey="value" 
                        fill="url(#barGradient)" 
                        radius={[0, 8, 8, 0]} 
                        barSize={24}
                        animationDuration={1000}
                      >
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          formatter={(v:number) => `$${v.toLocaleString()}`} 
                          className="fill-foreground text-xs font-medium" 
                        />
                      </Bar>
                    </LazyBarChart>
                  </ChartContainer>
                </Suspense>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid gap-4 lg:grid-cols-7">
            {/* Enhanced Recent Transactions */}
            <Card className="col-span-full lg:col-span-4 border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-primary" />
                      Recent Orders
                    </CardTitle>
                    <CardDescription>Live transaction feed</CardDescription>
                  </div>
                  <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Real-time
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {recentOrders.length > 0 ? (
                  <div className="space-y-2">
                    {recentOrders.map((order, index) => {
                      const PaymentIcon = paymentIcons[order.paymentmethod] || CreditCard;
                      return (
                        <div 
                          key={order.orderid}
                          className="group flex items-center justify-between p-3 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                          style={{ 
                            animationDelay: `${index * 100}ms`,
                            animation: 'slideIn 0.5s ease-out'
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10 border-2 border-slate-100 dark:border-slate-800">
                                <AvatarImage src={`https://api.dicebear.com/7.x/shapes/svg?seed=${order.orderid}`} />
                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                                  <Receipt className="h-4 w-4 text-primary" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Order #{order.orderid}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {order.order_time_label}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant="secondary" 
                              className="capitalize flex items-center gap-1 bg-slate-100 dark:bg-slate-800 group-hover:bg-primary/10"
                            >
                              <PaymentIcon className="h-3 w-3" />
                              {order.paymentmethod}
                            </Badge>
                            <div className="text-right">
                              <div className="font-bold text-base text-slate-900 dark:text-slate-100">
                                ${Number(order.total_order_price).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState 
                    icon={Receipt} 
                    message="No recent orders" 
                    description="Orders will appear here as they come in"
                  />
                )}
              </CardContent>
            </Card>

            {/* Enhanced Operations Dashboard */}
            <Card className="col-span-full lg:col-span-3 border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur">
              <CardHeader className="pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Operations Center
                  </CardTitle>
                  <CardDescription>Inventory & payment insights</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stock Alerts Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Stock Alerts ({activeAlerts.length})
                  </h4>
                  {activeAlerts.length > 0 ? (
                    <div className="space-y-2">
                      {activeAlerts.map((item, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-all",
                            item.status === 'critical' 
                              ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900" 
                              : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
                          )}
                          style={{ 
                            animationDelay: `${i * 100}ms`,
                            animation: 'slideIn 0.5s ease-out'
                          }}
                        >
                          {item.status === 'critical' 
                            ? <AlertOctagon className="h-4 w-4 text-red-600 dark:text-red-500 flex-shrink-0 animate-pulse" /> 
                            : <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {item.item_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress 
                                value={Math.min((item.supply / thresholds.warn) * 100, 100)}
                                className={cn(
                                  "h-1.5 flex-1 bg-slate-200 dark:bg-slate-700",
                                  // Using [&>*] to target the inner indicator div of Shadcn Progress component
                                  item.status === 'critical' ? "[&>*]:bg-red-500" : "[&>*]:bg-amber-500"
                                )}
                              />
                              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                {item.supply} {item.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">All Systems Operational</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                          Inventory levels are healthy
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Methods Pie Chart */}
                <div className="pt-4 border-t">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Payment Distribution
                  </h4>
                  <div className="h-[180px]">
                    <Suspense fallback={<Skeleton className="h-[180px] w-full rounded-lg" />}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LazyPieChart>
                          <Pie 
                            data={paymentMethods} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={45} 
                            outerRadius={70} 
                            paddingAngle={3} 
                            dataKey="value"
                            animationDuration={1000}
                          >
                            {paymentMethods?.map((_, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={COLORS[index % COLORS.length]}
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [`${value} orders`, 'Count']}
                            contentStyle={{ 
                              borderRadius: '8px', 
                              border: '1px solid #e2e8f0',
                              backgroundColor: 'rgba(255, 255, 255, 0.95)'
                            }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            iconType="circle"
                            formatter={(value) => (
                              <span className="text-xs">{value}</span>
                            )}
                          />
                        </LazyPieChart>
                      </ResponsiveContainer>
                    </Suspense>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

// Enhanced KPI Card Component
function EnhancedKpiCard({
  title,
  icon: Icon,
  value,
  sub,
  trend,
  color = "slate",
  previousValue
}: {
  title: string;
  icon: any;
  value: string | number;
  sub: string;
  trend?: number;
  color?: string;
  previousValue?: string | number;
}) {
  const colorStyles: Record<string, string> = {
    emerald: "from-emerald-500 to-emerald-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    pink: "from-pink-500 to-pink-600",
    cyan: "from-cyan-500 to-cyan-600",
    slate: "from-slate-500 to-slate-600",
  };

  return (
    <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white/50 dark:bg-slate-900/50 backdrop-blur group hover:-translate-y-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </CardTitle>
          <div className={cn(
            "p-2 rounded-lg bg-gradient-to-br",
            colorStyles[color],
            "bg-opacity-10 group-hover:scale-110 transition-transform"
          )}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold tabular-nums tracking-tight">
            {value}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{sub}</p>
            
            <div className="flex items-center gap-2">
              {previousValue !== undefined && (
                <span className="text-[10px] text-muted-foreground/70 font-medium">
                  {/* If trend is undefined, assume previousValue is a label like "vs 12PM" */}
                  {typeof previousValue === 'string' && previousValue.startsWith('vs')
                    ? previousValue
                    : `vs ${previousValue}`}
                </span>
              )}

              {/* Only render badge if trend is defined */}
              {trend !== undefined && (
                <div className={cn(
                  "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
                  trend > 0
                    ? "text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/50"
                    : trend < 0
                      ? "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950/50"
                      : "text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800"
                )}>
                  {trend > 0 && <ArrowUp className="h-3 w-3" />}
                  {trend < 0 && <ArrowDown className="h-3 w-3" />}
                  {trend === 0 && <Minus className="h-3 w-3" />}
                  {Math.abs(trend).toFixed(1)}%
                </div>
              )}
            </div>

          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Enhanced Skeleton Components
function EnhancedDashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1800px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
      </div>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
      
      <div className="grid gap-4 lg:grid-cols-7">
        <Skeleton className="col-span-4 h-[400px] rounded-xl" />
        <Skeleton className="col-span-3 h-[400px] rounded-xl" />
      </div>
      
      <div className="grid gap-4 lg:grid-cols-7">
        <Skeleton className="col-span-4 h-[400px] rounded-xl" />
        <Skeleton className="col-span-3 h-[400px] rounded-xl" />
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return <Skeleton className="h-[320px] w-full rounded-lg animate-pulse" />
}

// Empty State Component
function EmptyState({ 
  icon: Icon, 
  message, 
  description 
}: { 
  icon: any; 
  message: string; 
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-3">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {message}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {description}
      </p>
    </div>
  )
}

// Error State Component  
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[600px] gap-4">
      <div className="p-4 bg-red-100 dark:bg-red-950/30 rounded-full">
        <AlertOctagon className="h-8 w-8 text-red-600 dark:text-red-500" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Something went wrong while fetching the dashboard data. Please try again.
        </p>
      </div>
      <Button onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  )
}