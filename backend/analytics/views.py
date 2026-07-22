from datetime import date

from django.db.models import F, Sum
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.models import Transaction, TransactionType
from analytics.serializers import AnalyticsQuerySerializer
from credit.models import CreditLedger, CreditStatus
from inventory.models import Inventory, Product


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        store_id = request.query_params.get("store_id")

        product_count = Product.objects.filter(store_id=store_id, is_active=True).count()

        low_stock = Inventory.objects.filter(
            product__store_id=store_id,
            quantity__lte=F("reorder_level"),
        ).count()

        pending_credit = CreditLedger.objects.filter(
            store_id=store_id,
            status__in=[CreditStatus.PENDING, CreditStatus.PARTIAL, CreditStatus.OVERDUE],
        ).aggregate(total=Sum("balance"))["total"] or 0

        today_revenue = Transaction.objects.filter(
            store_id=store_id,
            type=TransactionType.SALE,
            created_at__date=date.today(),
        ).aggregate(total=Sum("total"))["total"] or 0

        return Response({
            "total_products": product_count,
            "low_stock_count": low_stock,
            "pending_credit": float(pending_credit),
            "today_revenue": float(today_revenue),
            "today_profit": 0.0,  # TODO: compute from cost_price
        })


class SmartSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AnalyticsQuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({"message": f"Analytics query received: {serializer.validated_data['question']}"})
