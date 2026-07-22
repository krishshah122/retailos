import uuid

from django.db import models

from core.models import Store, User


class TransactionType(models.TextChoices):
    SALE = "sale", "Sale"
    PURCHASE = "purchase", "Purchase"
    ADJUSTMENT = "adjustment", "Adjustment"
    RETURN = "return", "Return"


class Transaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_index=True)
    product_id = models.UUIDField()  # FK to inventory.Product
    type = models.CharField(max_length=20, choices=TransactionType.choices)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    customer_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "transactions"


class Forecast(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_index=True)
    product_id = models.UUIDField()
    predicted_demand = models.IntegerField()
    reorder_date = models.DateField(null=True, blank=True)
    confidence = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "forecasts"


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_index=True)
    title = models.CharField(max_length=255)
    body = models.TextField()
    type = models.CharField(max_length=50)  # credit_reminder, reorder, insight
    is_read = models.BooleanField(default=False)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
