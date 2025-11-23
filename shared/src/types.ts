export interface MenuItem {
  item_id: number;
  item_name: string;
  cost: number;
  category: string;
}

export interface InventoryItem {
  item_id: number;
  item_name: string;
  supply: number;
  unit: string | null;
  cost: number | string;
}

export interface OrderItem {
    item_id: number;
    item_name: string;
    quantity: number;
    cost: number;
}

export interface ApiResponse<T> {
    data: T;
    message?: string;
    success?: boolean;
}

// --- NEW DASHBOARD TYPES ---

export interface DashboardKPI {
  total_revenue: number;
  total_orders: number;
  active_staff: number;
}

export interface DashboardTrend {
  sort_key: string | number;
  time_label: string;
  revenue: number;
  order_count: number;
}

export interface DashboardChartItem {
  name: string;
  value: number;
}

export interface DashboardData {
  kpi: DashboardKPI;
  trend: DashboardTrend[];
  topItems: DashboardChartItem[];
  categorySales: DashboardChartItem[];
  paymentMethods: DashboardChartItem[];
  lowStock: InventoryItem[];
}