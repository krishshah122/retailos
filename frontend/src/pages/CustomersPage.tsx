import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { Customer } from "@/types";

export default function CustomersPage() {
  const { activeStore } = useAuth();
  const storeId = activeStore?.id || "";

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers", storeId],
    queryFn: async () => {
      const { data } = await api.get<Customer[]>("/credit/customers", {
        params: { store_id: storeId },
      });
      return data;
    },
    enabled: !!storeId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <p className="mt-1 text-slate-500">Customer ledger and outstanding balances for this store.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 font-medium text-slate-700">Customer</th>
              <th className="px-6 py-3 font-medium text-slate-700">Phone</th>
              <th className="px-6 py-3 font-medium text-slate-700">Total Credit</th>
              <th className="px-6 py-3 font-medium text-slate-700">Outstanding</th>
              <th className="px-6 py-3 font-medium text-slate-700">Entries</th>
              <th className="px-6 py-3 font-medium text-slate-700">Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  Loading customers...
                </td>
              </tr>
            )}

            {!isLoading && (!customers || customers.length === 0) && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  No customer records yet. Credit entries will appear here automatically.
                </td>
              </tr>
            )}

            {customers?.map((customer) => (
              <tr key={customer.id} className="border-b border-slate-100 last:border-b-0">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{customer.name}</div>
                </td>
                <td className="px-6 py-4 text-slate-600">{customer.phone || "—"}</td>
                <td className="px-6 py-4 font-medium text-slate-800">{formatCurrency(customer.total_credit)}</td>
                <td className={`px-6 py-4 font-semibold ${customer.total_outstanding > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                  {formatCurrency(customer.total_outstanding)}
                </td>
                <td className="px-6 py-4 text-slate-600">{customer.entries_count}</td>
                <td className="px-6 py-4 text-slate-600">
                  {customer.last_entry_at ? new Date(customer.last_entry_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
