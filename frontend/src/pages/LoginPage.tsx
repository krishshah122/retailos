import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current) return;

    const render = () => {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          setError("");
          setLoading(true);
          try {
            await loginWithGoogle(response.credential);
            navigate("/dashboard");
          } catch {
            setError("Google sign-in failed. Check backend and Client ID.");
          } finally {
            setLoading(false);
          }
        },
      });
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "signin_with",
        shape: "rectangular",
      });
    };

    if (window.google) {
      render();
      return;
    }

    const existing = document.getElementById("google-gsi");
    if (existing) {
      existing.addEventListener("load", render);
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.body.appendChild(script);
  }, [loginWithGoogle, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-brand-700">RetailOS</h1>
        <p className="mt-1 text-sm text-slate-500">AI Operating System for Small Retail</p>

        <div className="mt-8 space-y-4">
          {!GOOGLE_CLIENT_ID ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Set <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code> in{" "}
              <code className="font-mono">frontend/.env</code>. See{" "}
              <code className="font-mono">docs/GOOGLE_AUTH.md</code>.
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div ref={buttonRef} />
              {loading && <p className="text-sm text-slate-500">Signing you in…</p>}
            </div>
          )}
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Sign in with your Google account to continue
        </p>
      </div>
    </div>
  );
}
