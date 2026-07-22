from django.urls import path

from agents.views import (
    AgentRunDetailView,
    AgentRunListView,
    AgentRunView,
    InventoryPhotoView,
    InventoryVoiceView,
)

urlpatterns = [
    path("run", AgentRunView.as_view(), name="agent-run"),
    path("runs", AgentRunListView.as_view(), name="agent-runs"),
    path("runs/<uuid:run_id>", AgentRunDetailView.as_view(), name="agent-run-detail"),
    path("inventory/photo", InventoryPhotoView.as_view(), name="agent-inventory-photo"),
    path("inventory/voice", InventoryVoiceView.as_view(), name="agent-inventory-voice"),
]
