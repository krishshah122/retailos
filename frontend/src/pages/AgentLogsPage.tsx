import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { AgentRun } from "@/types";

export default function AgentLogsPage() {
  const { activeStore } = useAuth();
  const storeId = activeStore?.id || "";

  const { data: runs, isLoading } = useQuery({
    queryKey: ["agent-runs", storeId],
    queryFn: async () => {
      const { data } = await api.get<AgentRun[]>("/agent/runs", { params: { store_id: storeId } });
      return data;
    },
    enabled: !!storeId,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Agent Execution Logs</h1>
      <p className="mt-1 text-slate-500">LangGraph runs, confidence scores, and node traces</p>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-slate-400">Loading...</p>}
        {!isLoading && (!runs || runs.length === 0) && (
          <p className="text-slate-400">No agent runs yet. Try AI Inventory.</p>
        )}
        {runs?.map((run) => (
          <div key={run.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">{run.graph_name} · {run.input_type}</p>
                <p className="text-xs text-slate-500">{new Date(run.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {run.status}
                </span>
                {run.confidence != null && (
                  <p className="mt-1 text-xs text-slate-500">
                    Confidence: {(run.confidence * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
