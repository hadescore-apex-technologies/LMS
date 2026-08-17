import random
# pyrefly: ignore [missing-import]
from django.db.models import Q
from apps.certificates.models import Certificate
from apps.lessons.models import Lesson, LessonProgress
from apps.quizzes.models import Quiz, QuizAttempt
from apps.assignments.models import Assignment, AssignmentSubmission
from apps.core.models import AuditLog

def check_and_generate_certificate(student, course):
    if not student or not course:
        return None

    # 1. Lesson Completion Check
    total_lessons = Lesson.objects.filter(module__course=course).count()
    completed_lessons = LessonProgress.objects.filter(
        student=student, 
        lesson__module__course=course, 
        completed=True
    ).count()

    # 2. Quiz Attempt Check (attending the quiz unlocks completion)
    quizzes = Quiz.objects.filter(Q(module__course=course))
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
    is_complete = False
    if total_items > 0 and completed_lessons >= total_lessons and attended_quizzes and submitted_assignments:
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

                # Send completion email with portal download instructions
                from apps.core.emails import send_course_completion_email
                send_course_completion_email(existing.id)
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
            
            new_cert = Certificate.objects.create(
                student=student,
                course=course,
                certificate_code=cert_code,
                file_url="",
                is_issued=True
            )
            AuditLog.objects.create(
                user=None,
                action=f"System automatically generated and issued Certificate {cert_code} for student {student.email} on Course {course.title}",
            )

            # Send completion email with portal download instructions
            from apps.core.emails import send_course_completion_email
            send_course_completion_email(new_cert.id)
            return new_cert

    return None
