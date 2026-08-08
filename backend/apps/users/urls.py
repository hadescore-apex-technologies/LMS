
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.users.views import StaffViewSet, UserProfileViewSet, MentorListView
from apps.users.admin_manager_views import AdminManagerView

router = DefaultRouter()
router.register('staff', StaffViewSet, basename='staff')
router.register('profile', UserProfileViewSet, basename='profile')

urlpatterns = [
    path('profile/', UserProfileViewSet.as_view({
        'get': 'list',
        'post': 'create',
        'put': 'put',
        'patch': 'patch'
    }), name='user-profile'),
    path('', include(router.urls)),
    path('mentors/', MentorListView.as_view(), name='mentors-list'),
    path('admin-manager/', AdminManagerView.as_view(), name='admin-manager'),
]
