import random
# pyrefly: ignore [missing-import]
from django.db.models import Q
from apps.certificates.models import Certificate
from apps.lessons.models import Lesson, LessonProgress
from apps.quizzes.models import Quiz, QuizAttempt
from apps.assignments.models import Assignment, AssignmentSubmission
from apps.core.models import AuditLog

def check_and_generate_certificate(student, course):
    """
    Automatic certificate generation is disabled per user requirements.
    Only manually uploaded/edited certificates from admin should be visible to students.
    """
    return None
