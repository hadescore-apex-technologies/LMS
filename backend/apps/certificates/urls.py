from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.certificates.views import CertificateViewSet

router = DefaultRouter()
router.register('', CertificateViewSet, basename='certificates')

urlpatterns = [
    path('', include(router.urls)),
]
