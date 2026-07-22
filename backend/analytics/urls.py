from django.urls import path

from analytics.views import DashboardView, SmartSearchView

urlpatterns = [
    path("dashboard", DashboardView.as_view(), name="dashboard"),
    path("query", SmartSearchView.as_view(), name="smart-search"),
]
