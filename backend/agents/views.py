from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from agents.ai.supervisor import run_supervisor
from agents.models import AgentRun
from agents.serializers import AgentRunOutSerializer, AgentRunRequestSerializer


class AgentRunView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AgentRunRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Run the supervisor. Since Django views are synchronous but the LangGraph
        # supervisor is async (using asyncio), we run it using async_to_sync
        # or rewrite the supervisor to be synchronous.
        # For this migration, we assume run_supervisor can be called synchronously
        # since we removed the sqlalchemy async session dependency in favor of Django ORM.

        run = run_supervisor(
            store_id=data["store_id"],
            user_id=request.user.id,
            input_type=data["input_type"],
            payload=data["payload"],
        )

        out = AgentRunOutSerializer(run)
        return Response(out.data)


class AgentRunListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        store_id = request.query_params.get("store_id")
        runs = AgentRun.objects.filter(store_id=store_id).order_by("-created_at")[:50]
        serializer = AgentRunOutSerializer(runs, many=True)
        return Response(serializer.data)


class AgentRunDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, run_id):
        try:
            run = AgentRun.objects.get(id=run_id)
        except AgentRun.DoesNotExist:
            return Response({"detail": "Agent run not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = AgentRunOutSerializer(run)
        return Response(serializer.data)


class InventoryPhotoView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        store_id = request.query_params.get("store_id")
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        import base64
        content = file.read()
        b64_content = base64.b64encode(content).decode('utf-8')
        run = run_supervisor(
            store_id=store_id,
            user_id=request.user.id,
            input_type="image",
            payload={
                "filename": file.name,
                "content_type": file.content_type,
                "size": len(content),
                "file_b64": b64_content
            },
        )

        out = AgentRunOutSerializer(run)
        return Response(out.data)


class InventoryVoiceView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        store_id = request.query_params.get("store_id")
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        import base64
        content = file.read()
        b64_content = base64.b64encode(content).decode('utf-8')
        run = run_supervisor(
            store_id=store_id,
            user_id=request.user.id,
            input_type="voice",
            payload={
                "filename": file.name, 
                "size": len(content),
                "file_b64": b64_content
            },
        )

        out = AgentRunOutSerializer(run)
        return Response(out.data)
