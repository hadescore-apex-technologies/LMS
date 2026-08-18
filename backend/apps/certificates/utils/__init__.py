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

def is_course_completed_by_student(student, course):
    """
    Checks if a student has completed 100% of a course:
    - All lessons completed
    - All module quizzes attempted
    - All applicable homework assignments submitted
    """
    if not student or not course:
        return False

    # 1. Lesson Completion Check
    total_lessons = Lesson.objects.filter(module__course=course).count()
    completed_lessons = LessonProgress.objects.filter(
        student=student, 
        lesson__module__course=course, 
        completed=True
    ).count()

    # 2. Quiz Attempt Check (attending the quiz unlocks completion)
    quizzes = Quiz.objects.filter(module__course=course)
    attended_quizzes = True
    for quiz in quizzes:
        attempted = QuizAttempt.objects.filter(student=student, quiz=quiz).exists()
        if not attempted:
            attended_quizzes = False
            break

    # 3. Assignment Submission Check (only assignments applicable to this student)
    all_assignments = Assignment.objects.filter(Q(course=course) | Q(module__course=course))
    applicable_assignments = [
        assign for assign in all_assignments 
        if not assign.students.exists() or assign.students.filter(id=student.id).exists()
    ]
    
    submitted_assignments = True
    for assign in applicable_assignments:
        submitted = AssignmentSubmission.objects.filter(
            student=student, 
            assignment=assign
        ).exists()
        if not submitted:
            submitted_assignments = False
            break

    total_items = total_lessons + quizzes.count() + len(applicable_assignments)
    if total_items == 0:
        return True
    return completed_lessons >= total_lessons and attended_quizzes and submitted_assignments
