from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.modules.views import ModuleViewSet

router = DefaultRouter()
router.register('', ModuleViewSet, basename='modules')

urlpatterns = [
    path('', include(router.urls)),
]
