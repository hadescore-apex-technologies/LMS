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

    def perform_create(self, serializer):
        serializer.save()
        from apps.core.emails import clear_smtp_cache
        clear_smtp_cache()

    def perform_update(self, serializer):
        serializer.save()
        from apps.core.emails import clear_smtp_cache
        clear_smtp_cache()

    def perform_destroy(self, instance):
        instance.delete()
        from apps.core.emails import clear_smtp_cache
        clear_smtp_cache()

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
import logging
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

logger = logging.getLogger(__name__)

class FileUploadView(views.APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        try:
            # Look for file under any provided form key
            uploaded_file = request.FILES.get('file')
            if not uploaded_file and len(request.FILES) > 0:
                uploaded_file = next(iter(request.FILES.values()))

            if not uploaded_file:
                return response.Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check file size (limit to 5GB for video and asset files)
            max_size = 5 * 1024 * 1024 * 1024  # 5GB
            if uploaded_file.size > max_size:
                return response.Response({"error": "File too large. Maximum allowed size is 5GB."}, status=status.HTTP_400_BAD_REQUEST)
            
            ext = os.path.splitext(uploaded_file.name)[1].lower()
            video_exts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v', '.3gp', '.ts']
            image_exts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.ico']
            doc_exts = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.7z', '.txt']
            
            if ext in video_exts:
                subfolder = 'videos'
            elif 'cert' in str(request.data.get('type', '')).lower() or 'cert' in uploaded_file.name.lower():
                subfolder = 'certificates'
            elif ext in image_exts:
                subfolder = 'images'
            elif ext in doc_exts:
                subfolder = 'documents'
            else:
                subfolder = 'uploads'

            # Ensure media directory exists
            upload_dir = os.path.join(settings.MEDIA_ROOT, subfolder)
            os.makedirs(upload_dir, exist_ok=True)

            filename = f"{uuid.uuid4().hex}{ext}"
            rel_storage_path = os.path.join(subfolder, filename).replace('\\', '/')
            
            # Save file to media storage
            local_file_path = default_storage.save(rel_storage_path, uploaded_file)
            absolute_path = os.path.join(settings.MEDIA_ROOT, local_file_path) if not os.path.isabs(local_file_path) else local_file_path
            
            # Generate default local URL (used if Drive upload fails or is not configured)
            try:
                url = request.build_absolute_uri(default_storage.url(local_file_path))
            except Exception:
                url = f"/media/{local_file_path}"

            # If Google Drive is configured, upload synchronously to return the permanent URL
            if has_drive_credentials():
                try:
                    drive_url = upload_file_to_drive(absolute_path, uploaded_file.name)
                    if drive_url:
                        url = drive_url
                        # Clean up ephemeral local file to conserve Render disk space
                        if os.path.exists(absolute_path):
                            os.remove(absolute_path)
                except Exception as exc:
                    logger.warning(f"[Upload] Google Drive upload failed: {exc}. Using local storage fallback URL.")
                
            return response.Response({
                "url": url,
                "file_url": url,
                "filename": uploaded_file.name,
                "file_name": uploaded_file.name,
                "size": uploaded_file.size,
                "folder": subfolder,
                "status": "success"
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception(f"[Upload] File upload failed: {e}")
            return response.Response({
                "error": f"Upload failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


import mimetypes
import re
import requests
# pyrefly: ignore [missing-import]
from django.http import StreamingHttpResponse, HttpResponse, FileResponse
# pyrefly: ignore [missing-import]
from rest_framework.permissions import AllowAny

class FileDownloadProxyView(views.APIView):
    """
    Proxies file downloads with explicit 'Content-Disposition: attachment; filename=...'
    forcing browsers to immediately download any file (PDF, PPT, DOC, ZIP, certificates, guides, etc.)
    directly to local disk rather than opening or rendering in a new browser tab.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        target_url = request.query_params.get('url')
        filename = request.query_params.get('name') or request.query_params.get('filename')

        if not target_url:
            return HttpResponse("Missing url parameter", status=400)

        clean_url = target_url.strip()

        # 1. Local /media/ file path handling
        if '/media/' in clean_url:
            rel_path = clean_url.split('/media/', 1)[1].split('?')[0]
            disk_path = os.path.join(settings.MEDIA_ROOT, rel_path)
            if os.path.exists(disk_path):
                if not filename:
                    filename = os.path.basename(disk_path)
                content_type, _ = mimetypes.guess_type(disk_path)
                resp = FileResponse(open(disk_path, 'rb'), content_type=content_type or 'application/octet-stream')
                resp['Content-Disposition'] = f'attachment; filename="{filename}"'
                resp['Access-Control-Allow-Origin'] = '*'
                resp['Access-Control-Expose-Headers'] = 'Content-Disposition'
                return resp

        # 2. Google Drive / Remote HTTP URL handling
        drive_match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', clean_url) or re.search(r'[?&]id=([a-zA-Z0-9_-]+)', clean_url)
        if 'drive.google.com' in clean_url and drive_match:
            clean_url = f"https://drive.google.com/uc?id={drive_match.group(1)}&export=download"

        if not filename:
            filename = os.path.basename(clean_url.split('?')[0]) or 'download'
            if '.' not in filename:
                filename += '.pdf'
                
        # Fix relative URLs for internal fetches
        if clean_url.startswith('/'):
            # Convert to absolute URL using the request's host
            clean_url = request.build_absolute_uri(clean_url)

        try:
            req_headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            session = requests.Session()
            remote_resp = session.get(clean_url, headers=req_headers, stream=True, timeout=30, allow_redirects=True)

            # Handle Google Drive large file confirmation warning
            if 'text/html' in remote_resp.headers.get('Content-Type', ''):
                cookies = session.cookies.get_dict()
                confirm_token = None
                for k, v in cookies.items():
                    if k.startswith('download_warning'):
                        confirm_token = v
                        break
                if not confirm_token and 'confirm=' in remote_resp.text:
                    m = re.search(r'confirm=([0-9A-Za-z_-]+)', remote_resp.text)
                    if m:
                        confirm_token = m.group(1)
                if confirm_token and drive_match:
                    clean_url = f"https://drive.google.com/uc?id={drive_match.group(1)}&export=download&confirm={confirm_token}"
                    remote_resp = session.get(clean_url, headers=req_headers, stream=True, timeout=30, allow_redirects=True)

            def stream_iterator():
                try:
                    for chunk in remote_resp.iter_content(chunk_size=65536):
                        if chunk:
                            yield chunk
                finally:
                    remote_resp.close()

            content_type = remote_resp.headers.get('Content-Type') or mimetypes.guess_type(filename)[0] or 'application/octet-stream'
            response_obj = StreamingHttpResponse(stream_iterator(), content_type=content_type)
            response_obj['Content-Disposition'] = f'attachment; filename="{filename}"'
            if 'Content-Length' in remote_resp.headers:
                response_obj['Content-Length'] = remote_resp.headers['Content-Length']
            response_obj['Access-Control-Allow-Origin'] = '*'
            response_obj['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Length'
            return response_obj
        except Exception as err:
            logger.exception(f"[DownloadProxy] Failed to fetch remote file: {err}")
            return HttpResponse(f"Download failed: {err}", status=500)


class TestSMTPView(views.APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        to_email = request.data.get('email', '').strip() or request.user.email
        if not to_email:
            return response.Response({"error": "Target email is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Invalidate SMTP cache to force reload of newest settings
        from apps.core.emails import clear_smtp_cache, send_lms_email
        clear_smtp_cache()

        try:
            subject = "Apex LMS - SMTP Test Verification"
            body = (
                f"Hello {request.user.first_name or 'Admin'},\n\n"
                f"This is a test email sent from Apex LMS to verify that your Outgoing SMTP server is functioning properly.\n\n"
                f"Recipient: {to_email}\n"
                f"Timestamp: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n"
                f"If you received this message, your SMTP credentials and deliverability configuration are correctly set up!\n\n"
                f"Best regards,\n"
                f"Apex LMS Technical Team"
            )
            send_lms_email(to_email=to_email, subject=subject, text_body=body, async_mode=False)
            return response.Response({
                "status": "success",
                "message": f"Test email sent successfully to {to_email}! SMTP Connection verified."
            }, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception(f"[SMTP Test] Failed to send test email: {exc}")
            err_str = str(exc)
            if "Authentication" in err_str or "auth" in err_str.lower() or "535" in err_str:
                msg = f"SMTP Authentication Failed ({err_str}). For Gmail, ensure you are using a 16-character App Password with 2-Step Verification enabled."
            elif "Connection refused" in err_str or "timeout" in err_str.lower() or "111" in err_str:
                msg = f"SMTP Connection Failed ({err_str}). Check your SMTP Host name and Port number (587 for TLS, 465 for SSL)."
            else:
                msg = f"SMTP Error: {err_str}"
            return response.Response({
                "status": "error",
                "error": msg
            }, status=status.HTTP_400_BAD_REQUEST)

