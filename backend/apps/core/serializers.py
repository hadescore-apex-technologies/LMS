from rest_framework import serializers
from apps.core.models import AuditLog, PlatformSettings

class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True, default="System")

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_email', 'action', 'ip_address', 'created_at']

class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = ['id', 'key', 'value']
