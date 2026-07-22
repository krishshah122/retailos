from rest_framework import serializers


class DashboardStatsSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()
    pending_credit = serializers.FloatField()
    today_revenue = serializers.FloatField()
    today_profit = serializers.FloatField()


class AnalyticsQuerySerializer(serializers.Serializer):
    question = serializers.CharField()
    store_id = serializers.UUIDField()


class MessageResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
