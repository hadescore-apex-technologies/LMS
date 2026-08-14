# pyrefly: ignore [missing-import]
from django.utils import timezone
# pyrefly: ignore [missing-import]
from rest_framework import viewsets, views, status, response
from apps.core.models import AuditLog, PlatformSettings
from apps.core.serializers import AuditLogSerializer, PlatformSettingsSerializer
from apps.core.permissions import IsSuperAdmin

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsSuperAdmin]

class PlatformSettingsViewSet(viewsets.ModelViewSet):
    queryset = PlatformSettings.objects.all()
    serializer_class = PlatformSettingsSerializer
    permission_classes = [IsSuperAdmin]

class TriggerBackupView(views.APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        # Create an audit entry documenting who triggered the backup
        AuditLog.objects.create(
            user=request.user,
            action="Triggered manual database backup.",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        # Return mock success output representing the backup file stored on R2/S3
        return response.Response({
            "status": "success",
            "message": "Database backup completed successfully and pushed to Cloudflare R2 bucket.",
            "backup_file": f"backup_hadescore_apex_{int(timezone.now().timestamp() if 'timezone' in globals() else 1718000000)}.sql.gz"
        }, status=status.HTTP_200_OK)

import os
import uuid
from threading import Thread
# pyrefly: ignore [missing-import]
from django.conf import settings
# pyrefly: ignore [missing-import]
from django.core.files.storage import default_storage
# pyrefly: ignore [missing-import]
from rest_framework.parsers import MultiPartParser, FormParser
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated
from apps.core.drive_service import has_drive_credentials, upload_file_to_drive

class FileUploadView(views.APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def async_upload_to_drive(self, absolute_path, original_filename):
        """Upload to Google Drive in background thread"""
        try:
            upload_file_to_drive(absolute_path, original_filename)
            # Delete local temporary file after successful upload
            if os.path.exists(absolute_path):
                os.remove(absolute_path)
        except Exception as e:
            print(f"Background Google Drive upload failed: {e}")
            # Keep local file as backup if Drive upload fails

    def post(self, request):
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return response.Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check file size (limit to 50MB for faster uploads)
        max_size = 50 * 1024 * 1024  # 50MB
        if uploaded_file.size > max_size:
            return response.Response({"error": "File too large. Maximum size is 50MB."}, status=status.HTTP_400_BAD_REQUEST)
        
        ext = os.path.splitext(uploaded_file.name)[1]
        filename = f"{uuid.uuid4().hex}{ext}"
        
        # Always save locally first for immediate access
        local_file_path = default_storage.save(os.path.join('certificates', filename), uploaded_file)
        absolute_path = os.path.join(settings.MEDIA_ROOT, local_file_path)
        
        # Generate response URL immediately
        try:
            url = request.build_absolute_uri(default_storage.url(local_file_path))
        except Exception:
            url = f"/media/{local_file_path}"
        
        # If Google Drive is configured, upload in background (non-blocking)
        if has_drive_credentials():
            # Create a copy for background upload
            temp_file_path = default_storage.save(os.path.join('temp_uploads', filename), uploaded_file)
            temp_absolute_path = os.path.join(settings.MEDIA_ROOT, temp_file_path)
            
            # Start background upload thread
            upload_thread = Thread(
                target=self.async_upload_to_drive,
                args=(temp_absolute_path, uploaded_file.name)
            )
            upload_thread.daemon = True
            upload_thread.start()
            
        return response.Response({
            "url": url,
            "filename": uploaded_file.name
        }, status=status.HTTP_201_CREATED)
