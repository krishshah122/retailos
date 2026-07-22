from django.conf import settings
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.authentication import create_access_token, create_refresh_token
from core.models import Store, StoreMember, User, UserRole
from core.serializers import (
    GoogleAuthRequestSerializer,
    StoreCreateSerializer,
    StoreOutSerializer,
    StoreSearchOutSerializer,
    TokenResponseSerializer,
    UserOutSerializer,
)


def _tokens_for_user(user: User) -> dict:
    return {
        "access_token": create_access_token(str(user.id)),
        "refresh_token": create_refresh_token(str(user.id)),
        "token_type": "bearer",
    }


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleAuthRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not settings.GOOGLE_CLIENT_ID:
            return Response(
                {"detail": "GOOGLE_CLIENT_ID is not configured on the server"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            info = google_id_token.verify_oauth2_token(
                serializer.validated_data["credential"],
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValueError:
            return Response({"detail": "Invalid Google token"}, status=status.HTTP_401_UNAUTHORIZED)

        if info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            return Response({"detail": "Invalid Google token issuer"}, status=status.HTTP_401_UNAUTHORIZED)

        google_sub = info["sub"]
        email = info.get("email")
        if not email:
            return Response({"detail": "Google account has no email"}, status=status.HTTP_400_BAD_REQUEST)

        full_name = info.get("name") or email.split("@")[0]
        avatar_url = info.get("picture")

        # Find or create user
        user = User.objects.filter(google_id=google_sub).first()

        if not user:
            user = User.objects.filter(email=email).first()
            if user:
                user.google_id = google_sub
                user.avatar_url = avatar_url or user.avatar_url
                user.full_name = full_name or user.full_name
                user.save()
            else:
                user = User.objects.create(
                    email=email,
                    google_id=google_sub,
                    full_name=full_name,
                    avatar_url=avatar_url,
                    password_hash=None,
                )

        return Response(_tokens_for_user(user))


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserOutSerializer(request.user)
        return Response(serializer.data)


class AuthConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            "google_client_id": settings.GOOGLE_CLIENT_ID,
            "google_enabled": bool(settings.GOOGLE_CLIENT_ID),
        })


class StoreCreateListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Owned stores
        owned = Store.objects.filter(owner=request.user).select_related("owner")
        # Joined stores
        member_store_ids = StoreMember.objects.filter(user=request.user).values_list("store_id", flat=True)
        joined = Store.objects.filter(id__in=member_store_ids).select_related("owner")

        stores_by_id = {s.id: s for s in owned}
        for s in joined:
            stores_by_id[s.id] = s

        serializer = StoreOutSerializer(
            stores_by_id.values(), many=True, context={"request": request}
        )
        return Response(serializer.data)

    def post(self, request):
        serializer = StoreCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        store = Store.objects.create(
            owner=request.user,
            **serializer.validated_data,
        )
        out = StoreOutSerializer(store, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class StoreSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if not q or len(q) > 100:
            return Response({"detail": "q parameter required (1-100 chars)"}, status=status.HTTP_400_BAD_REQUEST)

        stores = Store.objects.filter(name__icontains=q).select_related("owner").order_by("name")[:20]
        serializer = StoreSearchOutSerializer(stores, many=True)
        return Response(serializer.data)


class StoreJoinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, store_id):
        try:
            store = Store.objects.select_related("owner").get(id=store_id)
        except Store.DoesNotExist:
            return Response({"detail": "Store not found"}, status=status.HTTP_404_NOT_FOUND)

        if store.owner_id == request.user.id:
            serializer = StoreOutSerializer(store, context={"request": request})
            return Response(serializer.data)

        StoreMember.objects.get_or_create(
            store=store,
            user=request.user,
            defaults={"role": UserRole.STAFF},
        )

        serializer = StoreOutSerializer(store, context={"request": request})
        return Response(serializer.data)
