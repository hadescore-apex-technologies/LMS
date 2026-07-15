from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.assignments.views import AssignmentViewSet, AssignmentSubmissionViewSet

router = DefaultRouter()
router.register('list', AssignmentViewSet, basename='assignments')
router.register('submissions', AssignmentSubmissionViewSet, basename='submissions')

urlpatterns = [
    path('', include(router.urls)),
]
