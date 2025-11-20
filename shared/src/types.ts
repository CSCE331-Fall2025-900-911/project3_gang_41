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
  unit: string;
  cost: number;
}

export interface Employee {
  employee_id: number;
  employee_name: string;
  job_title: string;
  hourly_rate: number;
  date_hired: Date;
}
