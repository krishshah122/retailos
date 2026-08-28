from rest_framework import serializers

from inventory.models import Product, Supplier

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'store', 'name', 'phone', 'email', 'address', 'gstin', 'tags', 'created_at']
        read_only_fields = ['id', 'created_at', 'store']


class ProductCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    sku = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    barcode = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    category = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    image_url = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    cost_price = serializers.FloatField(default=0)
    sell_price = serializers.FloatField(default=0)
    unit = serializers.CharField(max_length=50, default="pcs")
    supplier_id = serializers.UUIDField(required=False, allow_null=True)
    initial_quantity = serializers.IntegerField(default=0)

    def validate_category(self, value):
        if value:
            return value.strip().title()
        return value


class ProductUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    category = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    image_url = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    cost_price = serializers.FloatField(required=False)
    sell_price = serializers.FloatField(required=False)
    supplier_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_category(self, value):
        if value:
            return value.strip().title()
        return value


class ProductOutSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    sku = serializers.CharField(allow_null=True)
    category = serializers.CharField(allow_null=True)
    image_url = serializers.CharField(allow_null=True)
    cost_price = serializers.FloatField()
    sell_price = serializers.FloatField()
    unit = serializers.CharField()
    quantity = serializers.IntegerField(default=0)


class InventoryAdjustSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    delta = serializers.IntegerField()
    note = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class InventoryTransactionOutSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    product_id = serializers.UUIDField()
    delta = serializers.IntegerField()
    quantity_after = serializers.IntegerField()
    source = serializers.CharField()
    note = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()
