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
    path("google/", GoogleLoginView.as_view()),
    path("me", MeView.as_view(), name="me"),
    path("me/", MeView.as_view()),
    path("config", AuthConfigView.as_view(), name="auth-config"),
    path("config/", AuthConfigView.as_view()),
    path("stores/search", StoreSearchView.as_view(), name="store-search"),
    path("stores/search/", StoreSearchView.as_view()),
    path("stores/<uuid:store_id>/join", StoreJoinView.as_view(), name="store-join"),
    path("stores/<uuid:store_id>/join/", StoreJoinView.as_view()),
    path("stores", StoreCreateListView.as_view(), name="store-create-list"),
    path("stores/", StoreCreateListView.as_view()),
]
