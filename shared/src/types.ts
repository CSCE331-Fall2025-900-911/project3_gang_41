export interface MenuItem {
  item_id: number;
  item_name: string;
  cost: number; // Changed to number to match logic, ensure API converts string->number
  category: string;
}

export interface InventoryItem {
  item_id: number;
  item_name: string;
  supply: number;
  unit: string | null;
  cost: number;
}

export interface OrderItem {
    item_id: number;
    item_name: string;
    quantity: number;
    cost: number;
}

// Add this to ensure backend returns correct types
export interface ApiResponse<T> {
    data: T;
    message?: string;
    success?: boolean;
}