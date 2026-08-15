# pyrefly: ignore [missing-import]
from django.urls import path, include
# pyrefly: ignore [missing-import]
from rest_framework.routers import DefaultRouter
from apps.core.views import AuditLogViewSet, PlatformSettingsViewSet, TriggerBackupView, FileUploadView, FileDownloadProxyView, TestSMTPView

router = DefaultRouter()
router.register('logs', AuditLogViewSet, basename='audit-logs')
router.register('settings', PlatformSettingsViewSet, basename='settings')

urlpatterns = [
    path('', include(router.urls)),
    path('backup/', TriggerBackupView.as_view(), name='trigger-backup'),
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path('download/', FileDownloadProxyView.as_view(), name='file-download-proxy'),
    path('test-smtp/', TestSMTPView.as_view(), name='test-smtp'),
]
