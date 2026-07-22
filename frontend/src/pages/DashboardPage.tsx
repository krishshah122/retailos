import { useQuery } from "@tanstack/react-query";
import { Package, AlertTriangle, CreditCard, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { DashboardStats } from "@/types";

const statCards = [
  { key: "total_products", label: "Products", icon: Package, format: (v: number) => v.toString() },
  { key: "low_stock_count", label: "Low Stock", icon: AlertTriangle, format: (v: number) => v.toString() },
  { key: "pending_credit", label: "Pending Credit", icon: CreditCard, format: formatCurrency },
  { key: "today_revenue", label: "Today's Revenue", icon: TrendingUp, format: formatCurrency },
] as const;

export default function DashboardPage() {
  const { activeStore } = useAuth();
  const storeId = activeStore?.id || "";

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      const { data } = await api.get<DashboardStats>("/analytics/dashboard", {
        params: { store_id: storeId },
      });
      return data;
    },
    enabled: !!storeId,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-slate-500">Your store at a glance</p>

      {!storeId && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Create or select a store to see live data.
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon, format }) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{label}</p>
              <Icon className="h-5 w-5 text-brand-500" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {isLoading ? "—" : stats ? format(stats[key]) : "0"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">AI Insights</h2>
        <p className="mt-2 text-sm text-slate-500">
          Insights will appear here once you have sales and inventory data.
        </p>
      </div>
    </div>
  );
}
