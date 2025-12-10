// ─────────────────────────────────────────────────────────────────────────────
// Base Item Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base interface for any product/ingredient in the system.
 */
export interface BaseItem {
  item_id: number;
  item_name: string;
  cost: number;
}

/**
 * A menu item that can be ordered by customers.
 */
export interface MenuItem extends BaseItem {
  category: string;
  image_url?: string | null;
  is_available?: boolean;
  description?: string | null;
  ingredients_list?: InventoryItem[];
}

/**
 * An inventory item tracked for stock management.
 * Note: cost may come from DB as string due to numeric type.
 */
export interface InventoryItem extends Omit<BaseItem, 'cost'> {
  supply: number;
  unit: string | null;
  cost: number | string;
  reorder_threshold?: number;
  show_in_description?: boolean;
}

/**
 * An item within an order, including quantity.
 */
export interface OrderItem extends BaseItem {
  quantity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Drink Customization Types
// ─────────────────────────────────────────────────────────────────────────────

// UPDATED: Added 150 to the union type
export type SweetnessLevel = 0 | 25 | 50 | 75 | 100 | 125 | 150 | 200;
export type IceLevel = 'regular' | 'light' | 'none';
export type DrinkSize = 'small' | 'medium' | 'large';

export interface DrinkCustomization {
  sweetness: SweetnessLevel;
  ice: IceLevel;
  size: DrinkSize;
  temperature?: 'hot' | 'cold';
  toppings: string[];
}

/**
 * Default customization values for new drinks.
 */
export const DEFAULT_CUSTOMIZATION: DrinkCustomization = {
  sweetness: 100,
  ice: 'regular',
  size: 'medium',
  temperature: 'cold',
  toppings: [],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Cart Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A cart item with optional customization.
 * uniqueId distinguishes identical items with different customizations.
 */
export interface CartItem extends BaseItem {
  quantity: number;
  customization?: DrinkCustomization;
  uniqueId: string;
}

/**
 * Generates a unique ID for a cart item based on its properties.
 */
export const generateCartItemId = (
  itemId: number,
  customization?: DrinkCustomization
): string => {
  if (!customization) {
    return `item-${itemId}`;
  }
  // Sort toppings to ensure order doesn't matter (Boba+Jelly is same as Jelly+Boba)
  const toppingsStr = customization.toppings 
    ? customization.toppings.sort().join('+') 
    : '';
    
  return `item-${itemId}-${customization.size}-${customization.ice}-${customization.sweetness}-${toppingsStr}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Type guard to check if a response is successful.
 */
export const isSuccessResponse = <T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> => {
  return response.success === true;
};

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Types
// ─────────────────────────────────────────────────────────────────────────────

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

  // Velocity (Pacing) Percentages
  revenue_pacing_change: number;
  orders_pacing_change: number;

  // Previous Values for display
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

// ─────────────────────────────────────────────────────────────────────────────
// Person Types (Database Schema Aligned)
// ─────────────────────────────────────────────────────────────────────────────

export interface Customer {
  customers_id: number;
  customer_name: string;
  points: number;
  email?: string;
  phone_number?: string;
  sign_up_date?: string | Date;
  google_sub?: string;
}

export type EmployeeRole = 'manager' | 'cashier' | 'staff';

export interface Employee {
  employee_id: number;
  name: string;
  email: string;
  role: EmployeeRole;
  hourly_wage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Order Types
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'card' | 'digital';
export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled';

export interface Order {
  order_id: number;
  customer_id?: number | null;
  employee_id: number;
  order_date: string;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  items: OrderItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Makes all properties in T optional recursively.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extracts the data type from an ApiResponse.
 */
export type ExtractData<T> = T extends ApiSuccessResponse<infer D> ? D : never;