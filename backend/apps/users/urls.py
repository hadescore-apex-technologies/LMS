
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.users.views import StaffViewSet, UserProfileViewSet, MentorListView

router = DefaultRouter()
router.register('staff', StaffViewSet, basename='staff')
router.register('profile', UserProfileViewSet, basename='profile')

urlpatterns = [
    path('', include(router.urls)),
    path('mentors/', MentorListView.as_view(), name='mentors-list'),
]
