import { useState } from "react";
import { Camera, Mic, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function AIInventoryPage() {
  const { activeStore } = useAuth();
  const storeId = activeStore?.id || "";

  const [text, setText] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const runAgent = async (inputType: string, payload: Record<string, unknown>) => {
    if (!storeId) return;
    setLoading(true);
    try {
      const { data } = await api.post("/agent/run", {
        input_type: inputType,
        payload,
        store_id: storeId,
      });
      setResult(data.output_payload as Record<string, unknown>);
    } catch {
      setResult({ message: "Agent run failed. Is the backend running?" });
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (endpoint: string, file: File) => {
    if (!storeId) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const { data } = await api.post(`/agent/inventory/${endpoint}?store_id=${storeId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(data.output_payload as Record<string, unknown>);
    } catch {
      setResult({ message: "File upload failed." });
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    runAgent("text", { text });
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile("photo", file);
  };

  const handleVoice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile("voice", file);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">AI Inventory</h1>
      <p className="mt-1 text-slate-500">Update stock via photo, voice, or text</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Photo Inventory</h2>
            <p className="mt-1 text-sm text-slate-500">Upload a supplier invoice to <strong>add</strong> stock, or a daily sales sheet to <strong>decrease</strong> stock.</p>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-8 hover:border-brand-500 transition-colors">
              <Camera className="h-6 w-6 text-slate-400" />
              <span className="text-sm text-slate-500">Upload document photo</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Voice Inventory</h2>
            <p className="mt-1 text-sm text-slate-500">"Add 20 Samsung chargers" or "Sold 2 earphones"</p>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-8 hover:border-brand-500 transition-colors">
              <Mic className="h-6 w-6 text-slate-400" />
              <span className="text-sm text-slate-500">Upload voice recording</span>
              <input type="file" accept="audio/*" className="hidden" onChange={handleVoice} />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Text Command</h2>
          <form onSubmit={handleTextSubmit} className="mt-4 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='e.g. "Sold 2 Boat earphones"'
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !storeId}
              className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {result && (
            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <h3 className="text-sm font-medium">Agent Response</h3>
              <pre className="mt-2 overflow-auto text-xs text-slate-600">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
