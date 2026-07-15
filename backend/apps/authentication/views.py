from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.authentication.serializers import CustomTokenObtainPairSerializer
from rest_framework import views, status, response
from apps.core.permissions import IsSuperAdmin
from apps.core.models import AuditLog, PlatformSettings
from django.utils import timezone

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RevokeAllSessionsView(views.APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        setting, created = PlatformSettings.objects.get_or_create(key='jwt_invalidated_at')
        setting.value = str(timezone.now().timestamp())
        setting.save()

        AuditLog.objects.create(
            user=request.user,
            action="Revoked all active JWT sessions (platform-wide logouts).",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return response.Response({
            "status": "success",
            "message": "All active JWT sessions successfully revoked via token blacklist."
        }, status=status.HTTP_200_OK)
