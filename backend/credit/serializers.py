from rest_framework import serializers


class CreditCreateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=255)
    customer_phone = serializers.CharField(max_length=20, required=False, allow_null=True, allow_blank=True)
    amount = serializers.FloatField()
    due_date = serializers.DateField(required=False, allow_null=True)
    items = serializers.JSONField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class CreditPaymentCreateSerializer(serializers.Serializer):
    amount = serializers.FloatField()
    note = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class CreditOutSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    customer_id = serializers.UUIDField()
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    amount = serializers.FloatField()
    balance = serializers.FloatField()
    due_date = serializers.DateField(allow_null=True)
    status = serializers.CharField()
    created_at = serializers.DateTimeField()
