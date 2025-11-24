// Base interface for any product/ingredient in the system
export interface BaseItem {
  item_id: number;
  item_name: string;
  cost: number; // Standardized base cost
}

export interface MenuItem extends BaseItem {
  category: string;
}

export interface InventoryItem extends Omit<BaseItem, 'cost'> {
  supply: number;
  unit: string | null;
  // Inventory often comes raw from DB as numeric string, so we allow both here
  cost: number | string;
}

export interface OrderItem extends BaseItem {
  quantity: number;
}

// --- NEW: Moved from Frontend (Cashier/Kiosk duplication) ---

export interface DrinkCustomization {
  sweetness: 100 | 50 | 25;
  ice: 'regular' | 'light' | 'none';
  size: 'small' | 'medium' | 'large';
}

export interface CartItem extends BaseItem {
  quantity: number;
  customization?: DrinkCustomization;
  uniqueId: string; // Used for React keys and identifying duplicate items with diff customizations
}

// --- Existing Response Types ---

export interface ApiResponse<T> {
    data: T;
    message?: string;
    success?: boolean;
}

export interface DashboardKPI {
  // Current Totals
  total_revenue: number;
  total_orders: number;
  active_staff: number;

  // Trend Percentages (Standard)
  revenue_percent_change?: number;
  orders_percent_change?: number;
  avg_order_value_percent_change?: number;
  efficiency_percent_change?: number;

  // NEW: Velocity (Pacing) Percentages
  revenue_pacing_change: number;
  orders_pacing_change: number;

  // NEW: Previous Values for display
  prev_revenue_total: number;
  prev_orders_total: number;
  prev_revenue_paced: number;
  prev_orders_paced: number;
  prev_avg_order_value: number;
  prev_efficiency: number;

  // Peak Time Labels
  peak_time_label: string;
  prev_peak_time_label: string;
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