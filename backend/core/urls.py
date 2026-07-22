from django.urls import path

from core.views import (
    AuthConfigView,
    GoogleLoginView,
    MeView,
    StoreCreateListView,
    StoreJoinView,
    StoreSearchView,
)

urlpatterns = [
    path("google", GoogleLoginView.as_view(), name="google-login"),
    path("me", MeView.as_view(), name="me"),
    path("config", AuthConfigView.as_view(), name="auth-config"),
    path("stores/search", StoreSearchView.as_view(), name="store-search"),
    path("stores/<uuid:store_id>/join", StoreJoinView.as_view(), name="store-join"),
    path("stores", StoreCreateListView.as_view(), name="store-create-list"),
]
