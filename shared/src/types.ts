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