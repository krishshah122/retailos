from django.urls import path

from inventory.views import (
    InventoryAdjustView,
    InventoryTransactionListView,
    ProductDetailView,
    ProductListCreateView,
)

urlpatterns = [
    path("products", ProductListCreateView.as_view(), name="product-list-create"),
    path("products/<uuid:product_id>", ProductDetailView.as_view(), name="product-detail"),
    path("inventory/adjust", InventoryAdjustView.as_view(), name="inventory-adjust"),
    path("inventory/transactions", InventoryTransactionListView.as_view(), name="inventory-transactions"),
]
