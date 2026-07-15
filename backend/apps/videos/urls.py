from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.videos.views import VideoViewSet

router = DefaultRouter()
router.register('', VideoViewSet, basename='videos')

urlpatterns = [
    path('', include(router.urls)),
]
