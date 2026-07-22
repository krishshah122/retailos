import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import AgentLogsPage from "@/pages/AgentLogsPage";
import AIInventoryPage from "@/pages/AIInventoryPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import CreditPage from "@/pages/CreditPage";
import CustomersPage from "@/pages/CustomersPage";
import DashboardPage from "@/pages/DashboardPage";
import ForecastPage from "@/pages/ForecastPage";
import InventoryPage from "@/pages/InventoryPage";
import InvoicesPage from "@/pages/InvoicesPage";
import LoginPage from "@/pages/LoginPage";
import OnboardingPage from "@/pages/OnboardingPage";
import SettingsPage from "@/pages/SettingsPage";
import SuppliersPage from "@/pages/SuppliersPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, activeStore } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center font-medium text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!activeStore) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center font-medium text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/onboarding"
        element={
          <OnboardingRoute>
            <OnboardingPage />
          </OnboardingRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/ai-inventory" element={<AIInventoryPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/credit" element={<CreditPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/forecast" element={<ForecastPage />} />
        <Route path="/agent-logs" element={<AgentLogsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
