import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class UserRole(models.TextChoices):
    OWNER = "owner", "Owner"
    STAFF = "staff", "Staff"


class UserManager(BaseUserManager):
    def create_user(self, email, full_name="", password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, full_name=full_name, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name="Admin", password=None, **extra_fields):
        extra_fields.setdefault("role", UserRole.OWNER)
        extra_fields.setdefault("is_active", True)
        return self.create_user(email, full_name, password, **extra_fields)


class User(AbstractBaseUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=255, unique=True, db_index=True)
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True, db_index=True)
    password_hash = models.CharField(max_length=255, null=True, blank=True)
    full_name = models.CharField(max_length=255)
    avatar_url = models.TextField(null=True, blank=True)
    role = models.CharField(max_length=10, choices=UserRole.choices, default=UserRole.OWNER)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.email

    # AbstractBaseUser requires the password field to be named 'password'.
    # We store it in password_hash for compatibility but map it.
    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password_hash)

    @property
    def is_anonymous(self):
        return False

    @property
    def is_authenticated(self):
        return True


class Store(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="stores")
    name = models.CharField(max_length=255, db_index=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    whatsapp_number = models.CharField(max_length=20, null=True, blank=True, db_index=True)
    address = models.TextField(null=True, blank=True)
    gstin = models.CharField(max_length=15, null=True, blank=True)
    logo_url = models.TextField(null=True, blank=True)
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stores"

    def __str__(self):
        return self.name


class StoreMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="members", db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships", db_index=True)
    role = models.CharField(max_length=10, choices=UserRole.choices, default=UserRole.STAFF)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "store_members"
        constraints = [
            models.UniqueConstraint(fields=["store", "user"], name="uq_store_member"),
        ]

    def __str__(self):
        return f"{self.user.email} @ {self.store.name}"
