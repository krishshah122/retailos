"""LangGraph supervisor — routes to subgraphs by intent."""

import uuid
from datetime import datetime, timezone

from agents.ai.graphs.inventory_graph import run_inventory_pipeline
from agents.ai.state import AgentState
from agents.models import AgentRun, AgentRunStatus


def run_supervisor(
    store_id: uuid.UUID,
    user_id: uuid.UUID,
    input_type: str,
    payload: dict,
) -> AgentRun:
    run = AgentRun.objects.create(
        store_id=store_id,
        user_id=user_id,
        graph_name="supervisor",
        input_type=input_type,
        input_payload=payload,
        status=AgentRunStatus.RUNNING,
    )

    try:
        state: AgentState = {
            "store_id": str(store_id),
            "user_id": str(user_id),
            "input_type": input_type,
            "input_text": payload.get("text", ""),
            "input_payload": payload,
            "node_trace": [],
        }

        # Supervisor pipeline (sync nodes for scaffold; LangGraph wiring in week 2+)
        if state.get("input_type") in ("image", "voice", "text"):
            state = run_inventory_pipeline(state)

        run.output_payload = state.get("output")
        run.node_trace = state.get("node_trace")
        run.confidence = state.get("confidence")
        run.status = (
            AgentRunStatus.AWAITING_CONFIRMATION
            if state.get("requires_confirmation")
            else AgentRunStatus.COMPLETED
        )
        run.completed_at = datetime.now(timezone.utc)
    except Exception as e:
        run.status = AgentRunStatus.FAILED
        run.error = str(e)
        run.completed_at = datetime.now(timezone.utc)

    run.save()
    return run
