from rest_framework import serializers

from core.models import Store, User


class GoogleAuthRequestSerializer(serializers.Serializer):
    credential = serializers.CharField(help_text="Google ID token from Sign In with Google")


class TokenResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    token_type = serializers.CharField(default="bearer")


class UserOutSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "avatar_url", "created_at"]


class StoreCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=20, required=False, allow_null=True, allow_blank=True)
    address = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    gstin = serializers.CharField(max_length=15, required=False, allow_null=True, allow_blank=True)
    logo_url = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class StoreOutSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Store
        fields = ["id", "name", "phone", "address", "gstin", "logo_url", "owner_name", "is_owner", "created_at"]

    def get_owner_name(self, obj):
        return obj.owner.full_name if obj.owner else None

    def get_is_owner(self, obj):
        request = self.context.get("request")
        if request and request.user:
            return obj.owner_id == request.user.id
        # Check if user_id was passed in context
        user_id = self.context.get("user_id")
        if user_id:
            return obj.owner_id == user_id
        return False


class StoreSearchOutSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Store
        fields = ["id", "name", "address", "logo_url", "owner_name"]

    def get_owner_name(self, obj):
        return obj.owner.full_name if obj.owner else None
