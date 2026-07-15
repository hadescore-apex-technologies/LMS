from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.lessons.views import LessonViewSet, LessonBookmarkViewSet, LessonNoteViewSet

router = DefaultRouter()
router.register('bookmarks', LessonBookmarkViewSet, basename='lesson-bookmarks')
router.register('notes', LessonNoteViewSet, basename='lesson-notes')
router.register('', LessonViewSet, basename='lessons')

urlpatterns = [
    path('', include(router.urls)),
]
