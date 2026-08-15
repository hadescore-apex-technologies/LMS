from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.videos.views import VideoViewSet, VideoStreamProxyView

router = DefaultRouter()
router.register('', VideoViewSet, basename='videos')

urlpatterns = [
    path('stream/', VideoStreamProxyView.as_view(), name='video-stream'),
    path('', include(router.urls)),
]
