import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { User, Store } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  activeStore: Store | null;
  setActiveStore: (store: Store | null) => void;
  stores: Store[];
  fetchStores: () => Promise<Store[]>;
  loadingStores: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStoreState] = useState<Store | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);

  const selectStore = useCallback((store: Store | null) => {
    if (store) {
      localStorage.setItem("store_id", store.id);
    } else {
      localStorage.removeItem("store_id");
    }
    setActiveStoreState(store);
  }, []);

  const fetchStores = useCallback(async () => {
    setLoadingStores(true);
    try {
      const { data } = await api.get<Store[]>("/auth/stores");
      setStores(data);
      const storedId = localStorage.getItem("store_id");
      if (data.length > 0) {
        const found = data.find((s) => s.id === storedId);
        if (found) {
          setActiveStoreState(found);
        } else {
          localStorage.setItem("store_id", data[0].id);
          setActiveStoreState(data[0]);
        }
      } else {
        localStorage.removeItem("store_id");
        setActiveStoreState(null);
      }
      return data;
    } catch (err) {
      console.error("Failed to load stores", err);
      setStores([]);
      setActiveStoreState(null);
      return [];
    } finally {
      setLoadingStores(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    const initAuth = async () => {
      try {
        const res = await api.get<User>("/auth/me");
        setUser(res.data);
        await fetchStores();
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("store_id");
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [fetchStores]);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const { data } = await api.post("/auth/google", { credential });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    const me = await api.get<User>("/auth/me");
    setUser(me.data);
    await fetchStores();
  }, [fetchStores]);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("store_id");
    setUser(null);
    setStores([]);
    setActiveStoreState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        logout,
        activeStore,
        setActiveStore: selectStore,
        stores,
        fetchStores,
        loadingStores,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
