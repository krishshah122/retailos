import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Plus, Search, Building2, LogOut, MapPin, Phone, Hash, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

interface SearchResultStore {
  id: string;
  name: string;
  address?: string;
  logo_url?: string;
  owner_name?: string;
}

export default function OnboardingPage() {
  const { user, logout, fetchStores, setActiveStore } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  
  // Create Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Join State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultStore[]>([]);
  const [searching, setSearching] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState("");

  // Search effect with simple debouncing
  useEffect(() => {
    if (activeTab !== "join" || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      setJoinError("");
      try {
        const { data } = await api.get<SearchResultStore[]>("/auth/stores/search", {
          params: { q: searchQuery },
        });
        setSearchResults(data);
      } catch (err) {
        console.error(err);
        setJoinError("Failed to search stores.");
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab]);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setCreateError("");
    try {
      const { data } = await api.post("/auth/stores", {
        name,
        phone: phone || null,
        address: address || null,
        gstin: gstin || null,
      });
      // Refresh user's stores and set active store
      await fetchStores();
      setActiveStore(data);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setCreateError("Failed to create store. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinStore = async (storeId: string) => {
    setJoiningId(storeId);
    setJoinError("");
    try {
      const { data } = await api.post(`/auth/stores/${storeId}/join`);
      await fetchStores();
      setActiveStore(data);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setJoinError("Failed to join store. You might already be a member.");
    } finally {
      setJoiningId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-50 via-slate-50 to-brand-100/50">
      {/* Top bar with user name and logout */}
      <header className="flex w-full items-center justify-between border-b border-slate-200/60 bg-white/70 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-500/20">
            <Store className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">RetailOS</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">{user?.full_name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-red-600 hover:border-red-100"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main onboarding card container */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-xl backdrop-blur-md transition-all">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome to RetailOS
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Let's set up your store workspace to get started
            </p>
          </div>

          {/* Tab Selector */}
          <div className="mt-8 flex rounded-2xl bg-slate-100 p-1.5 shadow-inner">
            <button
              onClick={() => setActiveTab("create")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                activeTab === "create"
                  ? "bg-white text-brand-700 shadow-md shadow-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Plus className="h-4 w-4" />
              Create Shop
            </button>
            <button
              onClick={() => setActiveTab("join")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                activeTab === "join"
                  ? "bg-white text-brand-700 shadow-md shadow-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Search className="h-4 w-4" />
              Join Shop
            </button>
          </div>

          {activeTab === "create" ? (
            <form onSubmit={handleCreateStore} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sharma Grocery Store"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Phone Number
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Shop Address
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-3.5 text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Sector 62, Noida, UP"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all resize-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  GSTIN
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Hash className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 07AAAAA1111A1Z1"
                    maxLength={15}
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
              </div>

              {createError && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">
                  {createError}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition-all shadow-lg shadow-brand-600/20 hover:bg-brand-700 hover:shadow-brand-700/30 disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating workspace...</span>
                  </>
                ) : (
                  <span>Create & Open Shop</span>
                )}
              </button>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Search Shop Name
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type store name to search..."
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
              </div>

              {joinError && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">
                  {joinError}
                </div>
              )}

              <div className="mt-4 max-h-60 overflow-y-auto space-y-2 pr-1">
                {searching ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                    <span className="mt-2 text-xs">Searching stores...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-slate-50"
                    >
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">{s.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Owner: {s.owner_name || "Unknown"}
                          </p>
                          {s.address && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-1">
                              <MapPin className="h-3 w-3" />
                              {s.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleJoinStore(s.id)}
                        disabled={joiningId !== null}
                        className="ml-4 shrink-0 rounded-lg bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 transition-all hover:bg-brand-100 disabled:opacity-50"
                      >
                        {joiningId === s.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Join"
                        )}
                      </button>
                    </div>
                  ))
                ) : searchQuery.trim() ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No shops found matching "{searchQuery}"
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                    <Building2 className="h-8 w-8 text-slate-300" />
                    <span>Search above to find and request to join a store.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
