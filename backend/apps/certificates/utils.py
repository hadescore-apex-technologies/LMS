import random
from apps.certificates.models import Certificate
from apps.lessons.models import Lesson, LessonProgress
from apps.quizzes.models import Quiz, QuizAttempt
from apps.assignments.models import Assignment, AssignmentSubmission
from apps.core.models import AuditLog

def check_and_generate_certificate(student, course):
    # 1. Lesson Completion Check
    total_lessons = Lesson.objects.filter(module__course=course).count()
    completed_lessons = LessonProgress.objects.filter(
        student=student, 
        lesson__module__course=course, 
        completed=True
    ).count()

    # 2. Quiz Pass Check
    quizzes = Quiz.objects.filter(module__course=course)
    passed_quizzes = True
    for quiz in quizzes:
        passed = QuizAttempt.objects.filter(student=student, quiz=quiz, passed=True).exists()
        if not passed:
            passed_quizzes = False
            break

    # 3. Assignment Approval Check
    assignments = Assignment.objects.filter(module__course=course)
    approved_assignments = True
    for assign in assignments:
        approved = AssignmentSubmission.objects.filter(
            student=student, 
            assignment=assign
        ).exists()
        if not approved:
            approved_assignments = False
            break

    is_complete = False
    if total_lessons > 0 and completed_lessons >= total_lessons and passed_quizzes and approved_assignments:
        is_complete = True

    # Check if a certificate exists for this student and course
    existing = Certificate.objects.filter(student=student, course=course).first()
    if existing:
        if is_complete:
            if not existing.is_issued:
                existing.is_issued = True
                existing.save()
                
                # Log this unlock event
                AuditLog.objects.create(
                    user=None,
                    action=f"System automatically unlocked Certificate {existing.certificate_code} for student {student.email} on Course {course.title}",
                )
            return existing
        else:
            if existing.is_issued:
                existing.is_issued = False
                existing.save()
                
                # Log this lock event
                AuditLog.objects.create(
                    user=None,
                    action=f"System automatically locked Certificate {existing.certificate_code} for student {student.email} on Course {course.title} (New elements added)",
                )
            return None
    else:
        if is_complete:
            # Generate a default certificate automatically!
            rand_num = random.randint(100000, 999999)
            cert_code = f"HA-APEX-{rand_num}"
            mock_file_url = f"https://hadescore-apex-lms-storage.r2.cloudflarestorage.com/certificates/{cert_code}.pdf"
            
            new_cert = Certificate.objects.create(
                student=student,
                course=course,
                certificate_code=cert_code,
                file_url=mock_file_url,
                is_issued=True
            )
            AuditLog.objects.create(
                user=None,
                action=f"System automatically generated and issued Certificate {cert_code} for student {student.email} on Course {course.title}",
            )
            return new_cert

    return None
