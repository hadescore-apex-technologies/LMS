from rest_framework import viewsets
from apps.videos.models import Video
from apps.videos.serializers import VideoSerializer
from apps.core.permissions import IsSuperAdminOrStaff

class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    permission_classes = [IsSuperAdminOrStaff]
