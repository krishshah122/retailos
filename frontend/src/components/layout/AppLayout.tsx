import { useState, useRef, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bot,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Store as StoreIcon,
  ChevronDown,
  MapPin,
  Phone,
  Hash,
  UserCheck,
  Plus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/ai-inventory", label: "AI Inventory", icon: Sparkles },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/credit", label: "Credit Ledger", icon: CreditCard },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/forecast", label: "Forecast", icon: TrendingUp },
  { to: "/agent-logs", label: "Agent Logs", icon: Bot },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout() {
  const { user, logout, activeStore, stores, setActiveStore } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const otherStores = stores.filter((s) => s.id !== activeStore?.id);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white z-20">
        <div className="border-b border-slate-200 p-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
            R
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-none">RetailOS</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">AI Retail Suite</p>
          </div>
        </div>
        
        <nav className="space-y-1 p-4 overflow-y-auto h-[calc(100vh-140px)]">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "bg-brand-50 text-brand-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              <Icon className="h-4.5 w-4.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full border-t border-slate-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-semibold text-slate-700">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-bold text-slate-800">{user?.full_name}</p>
              <p className="truncate text-[10px] text-slate-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all duration-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-8 backdrop-blur-md">
          {/* Left section - Active Shop Quick info */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <StoreIcon className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-slate-700">{activeStore?.name}</span>
          </div>

          {/* Right section - Shop details widget corner & switcher */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-600 text-white font-bold text-xs">
                {activeStore?.name?.charAt(0).toUpperCase() || "S"}
              </div>
              <span className="truncate max-w-[150px]">{activeStore?.name}</span>
              <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", dropdownOpen && "rotate-180")} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl transition-all duration-200 z-50">
                {/* Active Shop Info */}
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">{activeStore?.name}</h3>
                    <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                      <UserCheck className="h-3 w-3" />
                      Active
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    {activeStore?.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="leading-tight">{activeStore.address}</span>
                      </div>
                    )}
                    {activeStore?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{activeStore.phone}</span>
                      </div>
                    )}
                    {activeStore?.gstin && (
                      <div className="flex items-center gap-2">
                        <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>GSTIN: {activeStore.gstin}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Switcher section */}
                {otherStores.length > 0 && (
                  <div className="mt-4 border-b border-slate-100 pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Shop
                    </p>
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-1.5 pr-1">
                      {otherStores.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setActiveStore(s);
                            setDropdownOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50"
                        >
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 font-bold text-[10px] text-slate-500">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate flex-1">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/onboarding");
                    }}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand-50 py-2.5 text-xs font-bold text-brand-700 transition-all hover:bg-brand-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add or Join Store
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
