export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "staff";
  avatar_url?: string | null;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  gstin?: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  category?: string | null;
  image_url?: string | null;
  cost_price: number;
  sell_price: number;
  unit: string;
  quantity: number;
}

export interface DashboardStats {
  total_products: number;
  low_stock_count: number;
  pending_credit: number;
  today_revenue: number;
  today_profit: number;
}

export interface CreditEntry {
  id: string;
  customer_id: string;
  amount: number;
  balance: number;
  due_date?: string;
  status: "pending" | "partial" | "paid" | "overdue";
  created_at: string;
}

export interface AgentRun {
  id: string;
  graph_name: string;
  input_type: string;
  status: string;
  output_payload?: Record<string, unknown>;
  confidence?: number;
  created_at: string;
}
