# pyrefly: ignore [missing-import]
from django.urls import path, include
# pyrefly: ignore [missing-import]
from rest_framework.routers import DefaultRouter
from apps.students.views import StudentViewSet

router = DefaultRouter()
router.register('', StudentViewSet, basename='student')

urlpatterns = [
    path('', include(router.urls)),
]
