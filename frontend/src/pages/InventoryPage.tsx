import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { Product } from "@/types";

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  image_url: "",
  cost_price: "0",
  sell_price: "0",
  unit: "pcs",
  initial_quantity: "0",
};

export default function InventoryPage() {
  const { activeStore } = useAuth();
  const storeId = activeStore?.id || "";
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; category: string; cost_price: string; sell_price: string; image_url: string } | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", storeId],
    queryFn: async () => {
      const { data } = await api.get<Product[]>("/products", { params: { store_id: storeId } });
      return data;
    },
    enabled: !!storeId,
  });

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>();
    const normalizedProducts = (products || []).slice().sort((a, b) => a.name.localeCompare(b.name));

    normalizedProducts.forEach((product) => {
      const groupName = (product.category || "Uncategorized").trim() || "Uncategorized";
      const existing = groups.get(groupName) || [];
      existing.push(product);
      groups.set(groupName, existing);
    });

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [products]);

  const selectedProduct = useMemo(() => {
    return (products || []).find((product) => product.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  const addProductMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        category: form.category.trim() || undefined,
        image_url: form.image_url.trim() || undefined,
        cost_price: Number(form.cost_price),
        sell_price: Number(form.sell_price),
        unit: form.unit.trim() || "pcs",
        initial_quantity: Number(form.initial_quantity),
      };

      const { data } = await api.post<Product>("/products", payload, { params: { store_id: storeId } });
      return data;
    },
    onSuccess: () => {
      setError(null);
      setForm(emptyForm);
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "response" in err && err.response && typeof err.response === "object"
          ? (err.response as { data?: { detail?: string } }).data?.detail || "Unable to add product"
          : "Unable to add product";
      setError(message);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/products/${productId}`, { params: { store_id: storeId } });
    },
    onSuccess: () => {
      setSelectedProductId(null);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
    },
    onError: (err: unknown) => {
      console.error("Failed to delete product:", err);
    },
  });

  const adjustQuantityMutation = useMutation({
    mutationFn: async ({ delta }: { delta: number }) => {
      if (!selectedProductId) return;
      const { data } = await api.post(
        "/inventory/adjust",
        { product_id: selectedProductId, delta, note: "Manual adjustment" },
        { params: { store_id: storeId } }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
    },
    onError: (err: unknown) => {
      console.error("Failed to adjust quantity:", err);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: { name: string; category: string; cost_price: number; sell_price: number; image_url: string }) => {
      if (!selectedProductId) return;
      const { data: result } = await api.patch(`/products/${selectedProductId}`, data, {
        params: { store_id: storeId },
      });
      return result;
    },
    onSuccess: () => {
      setIsEditingProduct(false);
      setEditForm(null);
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
    },
    onError: (err: unknown) => {
      console.error("Failed to update product:", err);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!storeId || !form.name.trim()) {
      setError("Please enter a product name.");
      return;
    }

    setError(null);
    addProductMutation.mutate();
  };

  const canSubmit = useMemo(() => form.name.trim().length > 0 && !addProductMutation.isPending, [form.name, addProductMutation.isPending]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">Browse products by category and open any SKU for full details.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Add Product
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          Loading products...
        </div>
      ) : groupedProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          No products yet. Add your first SKU to start building your catalog.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
          <div className="space-y-5 overflow-y-auto">
            {groupedProducts.map(([category, items]) => (
              <section key={category} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{category}</h2>
                    <p className="text-xs text-slate-500">{items.length} SKU{items.length === 1 ? "" : "s"}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                    {items.length}
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3">
                  {items.map((product) => {
                    const isSelected = selectedProduct?.id === product.id;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setSelectedProductId(product.id)}
                        className={`rounded-lg border p-2 text-left text-xs transition ${
                          isSelected
                            ? "border-brand-500 bg-brand-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <p className="truncate font-semibold text-slate-900">{product.name}</p>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${product.quantity <= 5 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {product.quantity}
                          </span>
                        </div>

                        <div className="flex items-start gap-1.5">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-semibold text-slate-500">{product.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-slate-500">SKU: {product.sku || "—"}</p>
                            <p className="text-xs font-semibold text-slate-900">{formatCurrency(product.sell_price)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            {selectedProduct ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-brand-600">Selected SKU</p>
                    {!isEditingProduct && <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">{selectedProduct.name}</h3>}
                  </div>
                  {!isEditingProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProduct(true);
                        setEditForm({
                          name: selectedProduct.name,
                          category: selectedProduct.category || "",
                          cost_price: String(selectedProduct.cost_price),
                          sell_price: String(selectedProduct.sell_price),
                          image_url: selectedProduct.image_url || "",
                        });
                      }}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      Edit
                    </button>
                  )}
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  {!isEditingProduct ? (
                    selectedProduct.image_url ? (
                      <img src={selectedProduct.image_url} alt={selectedProduct.name} className="h-28 w-full object-cover" />
                    ) : (
                      <div className="flex h-28 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-2xl font-semibold text-slate-600">
                        {selectedProduct.name.charAt(0).toUpperCase()}
                      </div>
                    )
                  ) : editForm ? (
                    <input
                      type="text"
                      value={editForm.image_url}
                      onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                      placeholder="Image URL"
                      className="h-28 w-full border-0 px-2 py-1 text-xs"
                    />
                  ) : null}
                </div>

                {!isEditingProduct ? (
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5">
                      <span>SKU</span>
                      <span className="font-medium text-slate-900">{selectedProduct.sku || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5">
                      <span>Category</span>
                      <span className="font-medium text-slate-900">{selectedProduct.category || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5">
                      <span>Stock</span>
                      <span className={`font-medium ${selectedProduct.quantity <= 5 ? "text-rose-700" : "text-slate-900"}`}>
                        {selectedProduct.quantity} {selectedProduct.unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5">
                      <span>Sell price</span>
                      <span className="font-medium text-slate-900">{formatCurrency(selectedProduct.sell_price)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5">
                      <span>Cost price</span>
                      <span className="font-medium text-slate-900">{formatCurrency(selectedProduct.cost_price)}</span>
                    </div>
                  </div>
                ) : editForm ? (
                  <div className="space-y-2 text-xs text-slate-600">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        placeholder="Product name"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Category</label>
                      <input
                        type="text"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        placeholder="Category"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Cost price</label>
                      <input
                        type="number"
                        value={editForm.cost_price}
                        onChange={(e) => setEditForm({ ...editForm, cost_price: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        placeholder="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Sell price</label>
                      <input
                        type="number"
                        value={editForm.sell_price}
                        onChange={(e) => setEditForm({ ...editForm, sell_price: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        placeholder="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                ) : null}

                {isEditingProduct && editForm ? (
                  <div className="space-y-2 border-t border-slate-200 pt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProduct(false);
                        setEditForm(null);
                      }}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateProductMutation.mutate({
                          name: editForm.name,
                          category: editForm.category,
                          cost_price: Number(editForm.cost_price),
                          sell_price: Number(editForm.sell_price),
                          image_url: editForm.image_url,
                        })
                      }
                      disabled={updateProductMutation.isPending}
                      className="flex-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
                    >
                      {updateProductMutation.isPending ? "Saving..." : "Save"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 border-t border-slate-200 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">Adjust Stock</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => adjustQuantityMutation.mutate({ delta: -1 })}
                          disabled={adjustQuantityMutation.isPending || selectedProduct.quantity <= 0}
                          className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustQuantityMutation.mutate({ delta: 1 })}
                          disabled={adjustQuantityMutation.isPending}
                          className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100"
                    >
                      Delete Product
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                <p className="font-medium text-slate-700">Select a card</p>
                <p>Details here</p>
              </div>
            )}
          </aside>
        </div>
      )}

      {showDeleteConfirm && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="rounded-xl bg-white p-6 shadow-xl max-w-sm">
            <h3 className="text-base font-semibold text-slate-900">Delete Product?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete <strong>{selectedProduct.name}</strong>? This action cannot be undone.
            </p>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteProductMutation.mutate(selectedProduct.id)}
                disabled={deleteProductMutation.isPending}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {deleteProductMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Add Product</h2>
                <p className="mt-1 text-sm text-slate-500">Create a SKU and place it into a category for your shop catalog.</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-sm text-slate-500 hover:text-slate-700">
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Product name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="e.g. iPhone 15"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">SKU</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Mobile, Accessories..."
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Image URL</label>
                  <input
                    value={form.image_url}
                    onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Unit</label>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="pcs"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Cost price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_price}
                    onChange={(e) => setForm((prev) => ({ ...prev, cost_price: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Sell price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sell_price}
                    onChange={(e) => setForm((prev) => ({ ...prev, sell_price: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Initial quantity</label>
                <input
                  type="number"
                  min="0"
                  value={form.initial_quantity}
                  onChange={(e) => setForm((prev) => ({ ...prev, initial_quantity: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
                >
                  {addProductMutation.isPending ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
