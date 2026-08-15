import re
import requests
import logging
from django.http import StreamingHttpResponse, HttpResponse
from rest_framework import viewsets, views
from rest_framework.permissions import AllowAny
from apps.videos.models import Video
from apps.videos.serializers import VideoSerializer
from apps.core.permissions import IsSuperAdminOrStaff

logger = logging.getLogger(__name__)

class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    permission_classes = [IsSuperAdminOrStaff]


class VideoStreamProxyView(views.APIView):
    """
    High-performance video streaming proxy.
    Proxies Google Drive / remote video streams into native HTML5 video
    with Range header chunk streaming, allowing the custom Apex Cyber Video Player
    to play Drive videos seamlessly without showing any Google Drive UI.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        file_id = request.query_params.get('id') or request.query_params.get('file_id')
        raw_url = request.query_params.get('url')

        if not file_id and raw_url:
            match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', raw_url) or re.search(r'[?&]id=([a-zA-Z0-9_-]+)', raw_url)
            if match:
                file_id = match.group(1)

        if not file_id and not raw_url:
            return HttpResponse("Missing video id or url parameter", status=400)

        # Build download target
        if file_id:
            target_url = f"https://drive.google.com/uc?id={file_id}&export=download"
        else:
            target_url = raw_url

        # Pass through Range header for fast scrub, seek, and buffer
        req_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        range_header = request.headers.get('Range') or request.META.get('HTTP_RANGE')
        if range_header:
            req_headers['Range'] = range_header

        try:
            session = requests.Session()
            resp = session.get(target_url, headers=req_headers, stream=True, allow_redirects=True, timeout=20)

            # Handle Google Drive large file virus-scan confirmation prompt if needed
            content_type = resp.headers.get('Content-Type', '')
            if 'text/html' in content_type:
                # Check for confirm token
                cookies = session.cookies.get_dict()
                confirm_token = None
                for key, val in cookies.items():
                    if key.startswith('download_warning'):
                        confirm_token = val
                        break
                if not confirm_token and 'confirm=' in resp.text:
                    match = re.search(r'confirm=([0-9A-Za-z_-]+)', resp.text)
                    if match:
                        confirm_token = match.group(1)

                if confirm_token and file_id:
                    confirmed_url = f"https://drive.google.com/uc?id={file_id}&export=download&confirm={confirm_token}"
                    resp = session.get(confirmed_url, headers=req_headers, stream=True, allow_redirects=True, timeout=20)

            def file_iterator(response_obj, chunk_size=131072):  # 128KB chunks
                try:
                    for chunk in response_obj.iter_content(chunk_size=chunk_size):
                        if chunk:
                            yield chunk
                finally:
                    response_obj.close()

            status_code = resp.status_code if resp.status_code in [200, 206] else 200
            stream_response = StreamingHttpResponse(
                file_iterator(resp),
                status=status_code,
                content_type=resp.headers.get('Content-Type', 'video/mp4')
            )

            # Copy essential video streaming headers
            for header_key in ['Content-Range', 'Content-Length', 'Accept-Ranges']:
                if header_key in resp.headers:
                    stream_response[header_key] = resp.headers[header_key]

            stream_response['Accept-Ranges'] = 'bytes'
            stream_response['Access-Control-Allow-Origin'] = '*'
            stream_response['Access-Control-Allow-Headers'] = 'Range, Content-Type'
            stream_response['Access-Control-Expose-Headers'] = 'Content-Range, Content-Length, Accept-Ranges'
            stream_response['Cache-Control'] = 'public, max-age=3600'
            return stream_response

        except Exception as e:
            logger.exception(f"Video streaming error: {e}")
            return HttpResponse(f"Streaming error: {str(e)}", status=502)
