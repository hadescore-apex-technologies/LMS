from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.courses.views import CourseViewSet, LiveClassViewSet, CategoryViewSet, CourseDiscussionPostViewSet, CourseDiscussionCommentViewSet, AITutorView

router = DefaultRouter()
router.register('list', CourseViewSet, basename='courses')
router.register('live', LiveClassViewSet, basename='live-classes')
router.register('categories', CategoryViewSet, basename='categories')
router.register('discussions/posts', CourseDiscussionPostViewSet, basename='discussion-posts')
router.register('discussions/comments', CourseDiscussionCommentViewSet, basename='discussion-comments')

urlpatterns = [
    path('ai-tutor/', AITutorView.as_view(), name='ai-tutor'),
    path('', include(router.urls)),
]
