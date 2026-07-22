from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("core.urls")),
    path("api/v1/", include("inventory.urls")),
    path("api/v1/credit/", include("credit.urls")),
    path("api/v1/analytics/", include("analytics.urls")),
    path("api/v1/agent/", include("agents.urls")),
    path("api/v1/whatsapp/", include("whatsapp.urls")),
    path("health", lambda request: __import__("django.http", fromlist=["JsonResponse"]).JsonResponse(
        {"status": "ok", "app": "RetailOS", "env": "development"}
    )),
]
