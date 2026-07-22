import { useState } from "react";
import { Plus, Store, Check, Building2, Phone, MapPin, Hash } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { activeStore, stores, fetchStores, setActiveStore } = useAuth();
  
  // Create Store Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const createStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setMessage("");
    try {
      const { data } = await api.post("/auth/stores", {
        name,
        phone: phone || null,
        address: address || null,
        gstin: gstin || null,
      });
      
      setMessageType("success");
      setMessage(`Store "${data.name}" created successfully!`);
      setName("");
      setPhone("");
      setAddress("");
      setGstin("");
      
      // Refresh the context list of stores and set this new store active
      await fetchStores();
      setActiveStore(data);
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Failed to create store. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
      <p className="mt-1 text-slate-500">Manage your shops and workspace setups</p>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {/* Left Column: Create Store Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Plus className="h-5 w-5 text-brand-600" />
            Create Another Store
          </h2>
          <p className="text-xs text-slate-400 mt-1">Set up a new retail outlet or workspace</p>

          <form onSubmit={createStore} className="mt-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Store Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Metro Station Outlet"
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9999988888"
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Shop 12, Main Bazar"
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all resize-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                GSTIN
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 07AAAAA1111A1Z1"
                maxLength={15}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            {message && (
              <p
                className={`text-xs font-semibold rounded-lg p-3 ${
                  messageType === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition-all shadow-md shadow-brand-600/10 hover:bg-brand-700 hover:shadow-brand-700/20 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create & Open Store"}
            </button>
          </form>
        </div>

        {/* Right Column: Stores List / Selector */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Store className="h-5 w-5 text-brand-600" />
            Your Workspaces
          </h2>
          <p className="text-xs text-slate-400 mt-1">Manage and switch between active stores</p>

          <div className="mt-6 space-y-3">
            {stores.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveStore(s)}
                className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                  activeStore?.id === s.id
                    ? "border-brand-500 bg-brand-50/20 ring-1 ring-brand-500"
                    : "border-slate-100 bg-slate-50/30 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className={`h-4.5 w-4.5 ${activeStore?.id === s.id ? "text-brand-600" : "text-slate-400"}`} />
                    <span className="font-bold text-sm text-slate-800">{s.name}</span>
                  </div>
                  {activeStore?.id === s.id && (
                    <span className="flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                      <Check className="h-3 w-3" />
                      Active
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  {s.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="leading-tight">{s.address}</span>
                    </div>
                  )}
                  {s.gstin && (
                    <div className="flex items-center gap-1.5">
                      <Hash className="h-3 w-3" />
                      <span>GSTIN: {s.gstin}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
