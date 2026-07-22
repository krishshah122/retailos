import uuid

from django.db import models

from core.models import Store, User


class AgentRunStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RUNNING = "RUNNING", "Running"
    AWAITING_CONFIRMATION = "AWAITING_CONFIRMATION", "Awaiting Confirmation"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"


class AgentRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    graph_name = models.CharField(max_length=100)
    input_type = models.CharField(max_length=50)  # text, voice, image, invoice
    input_payload = models.JSONField(null=True, blank=True)
    output_payload = models.JSONField(null=True, blank=True)
    node_trace = models.JSONField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=AgentRunStatus.choices, default=AgentRunStatus.PENDING)
    confidence = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    token_usage = models.IntegerField(null=True, blank=True)
    error = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "agent_runs"


class MerchantMemory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_index=True)
    memory_type = models.CharField(max_length=50)  # frequent_product, voice_correction
    key = models.CharField(max_length=255)
    value = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "merchant_memory"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_index=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=50)
    entity_id = models.UUIDField(null=True, blank=True)
    details = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
