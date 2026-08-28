import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Pencil, Trash2, MapPin, Phone, Mail, Building2, Tag } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Supplier } from "@/types";

export default function SuppliersPage() {
  const { activeStore } = useAuth();
  const storeId = activeStore?.id || "";
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [tags, setTags] = useState("");

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers", storeId],
    queryFn: async () => {
      const { data } = await api.get<Supplier[]>("/inventory/suppliers", {
        params: { store_id: storeId },
      });
      return data;
    },
    enabled: !!storeId,
  });

  const saveSupplier = useMutation({
    mutationFn: async (payload: Partial<Supplier>) => {
      if (editingSupplier) {
        return api.patch(`/inventory/suppliers/${editingSupplier.id}?store_id=${storeId}`, payload);
      } else {
        return api.post(`/inventory/suppliers/?store_id=${storeId}`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", storeId] });
      closeModal();
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/inventory/suppliers/${id}?store_id=${storeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", storeId] });
    },
  });

  const openAddModal = () => {
    setEditingSupplier(null);
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setGstin("");
    setTags("");
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setPhone(supplier.phone || "");
    setEmail(supplier.email || "");
    setAddress(supplier.address || "");
    setGstin(supplier.gstin || "");
    setTags(supplier.tags || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveSupplier.mutate({ name, phone, email, address, gstin, tags });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="mt-1 text-slate-500">Manage vendors, distributors, and brands.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full py-12 text-center text-slate-400">Loading suppliers...</div>
        )}

        {!isLoading && (!suppliers || suppliers.length === 0) && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 py-12 text-center text-slate-500">
            No suppliers found. Click "Add Supplier" to get started.
          </div>
        )}

        {suppliers?.map((supplier) => (
          <div key={supplier.id} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-900 text-lg line-clamp-1">{supplier.name}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(supplier)}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this supplier?")) {
                        deleteSupplier.mutate(supplier.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {supplier.gstin && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="font-mono text-xs uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{supplier.gstin}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-start gap-2 pt-1">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{supplier.address}</span>
                  </div>
                )}
                {supplier.tags && (
                  <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-slate-100">
                    {supplier.tags.split(',').map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full text-[10px] font-medium border border-brand-200 uppercase tracking-wider">
                        <Tag className="h-2.5 w-2.5" />
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400">
              Added {new Date(supplier.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold">{editingSupplier ? "Edit Supplier" : "Add Supplier"}</h2>
              <button onClick={closeModal} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Supplier Name *</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="e.g. Apple Distributors"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">GSTIN</label>
                    <input
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      placeholder="29XXXXX..."
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="contact@supplier.com"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                    placeholder="Full address"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Tags (Products / Categories)</label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="e.g. Mobile Accessories, Samsung, Wholesale"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveSupplier.isPending}
                  className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {saveSupplier.isPending ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
