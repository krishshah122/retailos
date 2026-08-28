import uuid

from django.db import models

from core.models import Store, User


class Supplier(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="suppliers", db_index=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(max_length=255, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    gstin = models.CharField(max_length=15, null=True, blank=True)
    tags = models.CharField(max_length=255, null=True, blank=True)  # e.g., "Mobile Accessories, Samsung"
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "suppliers"

    def __str__(self):
        return self.name


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="products", db_index=True)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name="products", db_index=True
    )
    name = models.CharField(max_length=255, db_index=True)
    sku = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    barcode = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    category = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    image_url = models.TextField(null=True, blank=True)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sell_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit = models.CharField(max_length=50, default="pcs")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "products"

    def __str__(self):
        return self.name


class Inventory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="inventory")
    quantity = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=5)
    last_counted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "inventory"

    def __str__(self):
        return f"{self.product.name}: {self.quantity}"


class InventoryTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_index=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    delta = models.IntegerField()
    quantity_after = models.IntegerField()
    source = models.CharField(max_length=50)  # manual, voice, photo, invoice
    agent_run_id = models.UUIDField(null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_transactions"

    def __str__(self):
        return f"{self.product.name} {self.delta:+d}"


class Invoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_index=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    invoice_number = models.CharField(max_length=100, null=True, blank=True)
    invoice_date = models.DateField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    file_url = models.TextField(null=True, blank=True)
    parsed_data = models.JSONField(null=True, blank=True)
    is_confirmed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "invoices"

    def __str__(self):
        return f"Invoice {self.invoice_number or self.id}"


class InvoiceItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    product_name = models.CharField(max_length=255)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = "invoice_items"

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"
