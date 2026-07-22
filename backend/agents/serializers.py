from rest_framework import serializers

from agents.models import AgentRun


class AgentRunRequestSerializer(serializers.Serializer):
    input_type = serializers.CharField(max_length=50)
    payload = serializers.JSONField()
    store_id = serializers.UUIDField()


class AgentRunOutSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentRun
        fields = [
            "id",
            "graph_name",
            "input_type",
            "status",
            "output_payload",
            "confidence",
            "created_at",
        ]
