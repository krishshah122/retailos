from typing import Any, TypedDict


class AgentState(TypedDict, total=False):
    store_id: str
    user_id: str
    input_type: str
    input_text: str
    input_payload: dict[str, Any]
    intent: str
    entities: dict[str, Any]
    confidence: float
    requires_confirmation: bool
    proposed_changes: list[dict[str, Any]]
    output: dict[str, Any]
    node_trace: list[dict[str, Any]]
    error: str | None
