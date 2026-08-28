from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from inventory.models import Inventory, InventoryTransaction, Product, Supplier
from inventory.serializers import (
    InventoryAdjustSerializer,
    InventoryTransactionOutSerializer,
    ProductCreateSerializer,
    ProductOutSerializer,
    ProductUpdateSerializer,
    SupplierSerializer,
)
from inventory.services import adjust_inventory, create_product


class SupplierViewSet(viewsets.ModelViewSet):
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        store_id = self.request.query_params.get("store_id")
        if not store_id:
            return Supplier.objects.none()
        return Supplier.objects.filter(store_id=store_id)

    def perform_create(self, serializer):
        store_id = self.request.query_params.get("store_id")
        if not store_id:
            raise PermissionDenied("store_id is required")
        serializer.save(store_id=store_id)


def _product_out(product, quantity=None):
    """Build product output dict."""
    if quantity is None:
        try:
            quantity = product.inventory.quantity
        except (Inventory.DoesNotExist, AttributeError):
            quantity = 0
    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,
        "category": product.category,
        "image_url": product.image_url,
        "cost_price": float(product.cost_price),
        "sell_price": float(product.sell_price),
        "unit": product.unit,
        "quantity": quantity,
    }


class ProductListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        store_id = request.query_params.get("store_id")
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 50))
        limit = max(1, min(limit, 1000))

        products = (
            Product.objects.filter(store_id=store_id, is_active=True)
            .select_related("inventory")
            .order_by("name")[skip : skip + limit]
        )
        data = [_product_out(p) for p in products]
        return Response(data)

    def post(self, request):
        store_id = request.query_params.get("store_id")
        serializer = ProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = create_product(store_id, serializer.validated_data.copy())
        out = _product_out(product, quantity=serializer.validated_data.get("initial_quantity", 0))
        return Response(out, status=status.HTTP_201_CREATED)


class ProductDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, product_id):
        try:
            product = Product.objects.select_related("inventory").get(id=product_id)
        except Product.DoesNotExist:
            return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProductUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(product, field, value)
        product.save()

        return Response(_product_out(product))

    def delete(self, request, product_id):
        store_id = request.query_params.get("store_id")
        try:
            product = Product.objects.get(id=product_id, store_id=store_id)
        except Product.DoesNotExist:
            return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        # Delete associated inventory first
        Inventory.objects.filter(product_id=product_id).delete()
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InventoryAdjustView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        store_id = request.query_params.get("store_id")
        serializer = InventoryAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tx = adjust_inventory(
            store_id=store_id,
            product_id=serializer.validated_data["product_id"],
            delta=serializer.validated_data["delta"],
            source="manual",
            note=serializer.validated_data.get("note"),
        )
        out = InventoryTransactionOutSerializer(tx)
        return Response(out.data)


class InventoryTransactionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        store_id = request.query_params.get("store_id")
        limit = int(request.query_params.get("limit", 50))
        limit = max(1, min(limit, 200))

        transactions = (
            InventoryTransaction.objects.filter(store_id=store_id)
            .order_by("-created_at")[:limit]
        )
        serializer = InventoryTransactionOutSerializer(transactions, many=True)
        return Response(serializer.data)
