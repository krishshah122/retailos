from datetime import date

from django.db.models import DecimalField, Max, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from credit.models import CreditLedger, CreditPayment, CreditStatus, Customer
from credit.serializers import (
    CreditCreateSerializer,
    CreditOutSerializer,
    CreditPaymentCreateSerializer,
    CustomerSummarySerializer,
)


class CreditListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        store_id = request.query_params.get("store_id")
        # Only show entries that have an outstanding balance (not fully paid)
        entries = CreditLedger.objects.filter(store_id=store_id, balance__gt=0).order_by("-created_at")
        serializer = CreditOutSerializer(entries, many=True)
        return Response(serializer.data)

    def post(self, request):
        store_id = request.query_params.get("store_id")
        serializer = CreditCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        customer, _ = Customer.objects.get_or_create(
            store_id=store_id,
            name=data["customer_name"],
            defaults={"phone": data.get("customer_phone")},
        )

        entry = CreditLedger.objects.create(
            store_id=store_id,
            customer=customer,
            amount=data["amount"],
            balance=data["amount"],
            due_date=data.get("due_date"),
            items=data.get("items"),
            note=data.get("note"),
            status=CreditStatus.PENDING,
        )
        out = CreditOutSerializer(entry)
        return Response(out.data, status=status.HTTP_201_CREATED)


class CustomerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        store_id = request.query_params.get("store_id")
        customers = Customer.objects.filter(store_id=store_id).order_by("name")

        customer_rows = []
        for customer in customers:
            ledger = customer.credit_entries.all()
            total_credit = ledger.aggregate(total=Coalesce(Sum("amount"), Value(0), output_field=DecimalField()))["total"] or 0
            total_outstanding = ledger.aggregate(total=Coalesce(Sum("balance"), Value(0), output_field=DecimalField()))["total"] or 0
            
            # Only include customers who actually owe money
            if float(total_outstanding) > 0:
                last_entry = ledger.order_by("-created_at").first()
                customer_rows.append({
                    "id": customer.id,
                    "name": customer.name,
                    "phone": customer.phone,
                    "total_outstanding": float(total_outstanding),
                    "total_credit": float(total_credit),
                    "entries_count": ledger.count(),
                    "last_entry_at": last_entry.created_at if last_entry else None,
                    "created_at": customer.created_at,
                })

        serializer = CustomerSummarySerializer(customer_rows, many=True)
        return Response(serializer.data)


class CreditPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, credit_id):
        try:
            entry = CreditLedger.objects.get(id=credit_id)
        except CreditLedger.DoesNotExist:
            return Response({"detail": "Credit entry not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = CreditPaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        CreditPayment.objects.create(
            credit=entry,
            amount=serializer.validated_data["amount"],
            note=serializer.validated_data.get("note"),
        )

        entry.balance = float(entry.balance) - serializer.validated_data["amount"]
        if entry.balance <= 0:
            entry.balance = 0
            entry.status = CreditStatus.PAID
        else:
            entry.status = CreditStatus.PARTIAL

        if entry.due_date and entry.due_date < date.today() and entry.status != CreditStatus.PAID:
            entry.status = CreditStatus.OVERDUE

        entry.save()

        out = CreditOutSerializer(entry)
        return Response(out.data)
