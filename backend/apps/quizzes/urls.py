from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.quizzes.views import QuizViewSet, QuestionViewSet, QuizAttemptViewSet

router = DefaultRouter()
router.register('list', QuizViewSet, basename='quizzes')
router.register('questions', QuestionViewSet, basename='questions')
router.register('attempts', QuizAttemptViewSet, basename='quiz-attempts')

urlpatterns = [
    path('', include(router.urls)),
]
