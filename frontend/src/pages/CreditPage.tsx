import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { CreditEntry } from "@/types";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PARTIAL: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
};

export default function CreditPage() {
  const { activeStore } = useAuth();
  const storeId = activeStore?.id || "";

  const [showAddModal, setShowAddModal] = useState(false);
  const [paymentCreditId, setPaymentCreditId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    amount: "",
    due_date: "",
    note: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    note: "",
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ["credit", storeId],
    queryFn: async () => {
      const { data } = await api.get<CreditEntry[]>("/credit/", { params: { store_id: storeId } });
      return data;
    },
    enabled: !!storeId,
  });

  const queryClient = useQueryClient();

  const addCreditMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form };
      if (!payload.due_date) {
        delete (payload as any).due_date;
      }
      const { data } = await api.post("/credit/", payload, { params: { store_id: storeId } });
      return data;
    },
    onSuccess: () => {
      setShowAddModal(false);
      setForm({ customer_name: "", customer_phone: "", amount: "", due_date: "", note: "" });
      queryClient.invalidateQueries({ queryKey: ["credit", storeId] });
      queryClient.invalidateQueries({ queryKey: ["customers", storeId] });
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentCreditId) return;
      const { data } = await api.post(`/credit/${paymentCreditId}/payment/`, paymentForm);
      return data;
    },
    onSuccess: () => {
      setPaymentCreditId(null);
      setPaymentForm({ amount: "", note: "" });
      queryClient.invalidateQueries({ queryKey: ["credit", storeId] });
      queryClient.invalidateQueries({ queryKey: ["customers", storeId] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Credit Ledger</h1>
          <p className="mt-1 text-slate-500">Track customer udhar and repayments</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Add Credit Entry
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 font-medium">Customer</th>
              <th className="px-6 py-3 font-medium">Due Date</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Balance</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Loading...</td>
              </tr>
            )}
            {!isLoading && (!entries || entries.length === 0) && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  No credit entries yet. Give udhaar by clicking "Add Credit Entry".
                </td>
              </tr>
            )}
            {entries?.map((e: any) => (
              <tr key={e.id} className="border-b border-slate-100">
                <td className="px-6 py-4 font-semibold text-slate-900">{e.customer_name}</td>
                <td className="px-6 py-4">{e.due_date || "—"}</td>
                <td className="px-6 py-4">{formatCurrency(e.amount)}</td>
                <td className="px-6 py-4 font-medium">{formatCurrency(e.balance)}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider ${statusColors[e.status]}`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {e.balance > 0 && (
                    <button
                      onClick={() => setPaymentCreditId(e.id)}
                      className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      Log Payment
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold">Add Credit (Udhaar)</h2>
            <form onSubmit={(e) => { e.preventDefault(); addCreditMutation.mutate(); }} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Customer Name</label>
                <input required value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Phone (Optional)</label>
                <input value={form.customer_phone} onChange={e => setForm({...form, customer_phone: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Amount</label>
                  <input required type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Due Date (Optional)</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Note</label>
                <input value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="e.g. 2 bags of cement" />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
                <button type="submit" disabled={addCreditMutation.isPending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                  {addCreditMutation.isPending ? "Saving..." : "Save Credit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentCreditId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold">Log Payment</h2>
            <form onSubmit={(e) => { e.preventDefault(); addPaymentMutation.mutate(); }} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Amount Received</label>
                <input required type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Note (Optional)</label>
                <input value={paymentForm.note} onChange={e => setPaymentForm({...paymentForm, note: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="e.g. Paid in cash" />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setPaymentCreditId(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
                <button type="submit" disabled={addPaymentMutation.isPending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                  {addPaymentMutation.isPending ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
