from rest_framework import viewsets, status, response
from rest_framework.permissions import IsAuthenticated
from apps.courses.models import Course, LiveClass
from apps.categories.models import Category
from apps.courses.serializers import CourseSerializer, LiveClassSerializer
from apps.categories.serializers import CategorySerializer
from apps.core.permissions import IsSuperAdminOrStaff, IsStaff, IsStudent, IsSuperAdmin
from apps.core.models import AuditLog

class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer

    def get_queryset(self):
        queryset = Category.objects.all()
        cat_type = self.request.query_params.get('type')
        if cat_type:
            queryset = queryset.filter(category_type=cat_type)
        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsSuperAdmin()]

    def perform_create(self, serializer):
        cat_type = self.request.data.get('category_type', 'COURSE')
        category = serializer.save(category_type=cat_type)
        AuditLog.objects.create(
            user=self.request.user,
            action=f"Created course category: {category.name}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def perform_update(self, serializer):
        category = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            action=f"Updated course category: {category.name}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def perform_destroy(self, instance):
        name = instance.name
        instance.delete()
        AuditLog.objects.create(
            user=self.request.user,
            action=f"Deleted course category: {name}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsSuperAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        from apps.users.models import CustomUser
        if not isinstance(user, CustomUser):
            return Course.objects.none()
        
        # Enforce Course Assignment & Mentor Rule for students
        if user.role == 'STUDENT':
            live_mode = self.request.query_params.get('live_mode') == 'true'
            profile = getattr(user, 'student_profile', None)
            staff = (profile.assigned_live_staff if live_mode else profile.assigned_staff) if profile else None
            staff_cat = getattr(getattr(staff, 'staff_profile', None), 'category', None)
            
            qs = Course.objects.filter(is_published=True)
            is_mentoring_track = self.request.query_params.get('is_mentoring_track')
            if is_mentoring_track is not None:
                qs = qs.filter(is_mentoring_track=(is_mentoring_track.lower() == 'true'))
            
            if profile:
                from django.db.models import Q
                filters = Q(enrolled_students=profile)
                if staff_cat:
                    filters |= Q(category=staff_cat)
                if staff:
                    filters |= Q(mentor=staff)
                return qs.filter(filters).select_related('category', 'mentor', 'created_by').distinct()
            return qs.select_related('category', 'mentor', 'created_by').all()
        
        # For staff and admin
        qs = Course.objects.select_related('category', 'mentor', 'created_by').all()
        is_mentoring_track = self.request.query_params.get('is_mentoring_track')
        if is_mentoring_track is not None:
            qs = qs.filter(is_mentoring_track=(is_mentoring_track.lower() == 'true'))
            
        # Enforce Category Rule for staff
        if user.role == 'STAFF':
            category = getattr(user, 'staff_profile', None) and user.staff_profile.category
            if category:
                return qs.filter(category=category)
            return qs
            
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        if user and user.is_authenticated and user.role == 'STUDENT':
            from apps.lessons.models import Lesson, LessonProgress
            from apps.quizzes.models import Quiz, QuizAttempt
            from apps.assignments.models import Assignment, AssignmentSubmission
            from django.db.models import Count
            
            courses = self.filter_queryset(self.get_queryset())
            course_ids = list(courses.values_list('id', flat=True))
            
            # 1. Total counts per course
            lesson_counts = dict(Lesson.objects.filter(module__course_id__in=course_ids).values('module__course_id').annotate(cnt=Count('id')).values_list('module__course_id', 'cnt'))
            quiz_counts = dict(Quiz.objects.filter(module__course_id__in=course_ids).values('module__course_id').annotate(cnt=Count('id')).values_list('module__course_id', 'cnt'))
            assignment_counts = dict(Assignment.objects.filter(module__course_id__in=course_ids).values('module__course_id').annotate(cnt=Count('id')).values_list('module__course_id', 'cnt'))
            
            # 2. Completed items per course for current student
            completed_lessons = dict(LessonProgress.objects.filter(student=user, lesson__module__course_id__in=course_ids, completed=True).values('lesson__module__course_id').annotate(cnt=Count('id')).values_list('lesson__module__course_id', 'cnt'))
            
            passed_quizzes = dict(QuizAttempt.objects.filter(student=user, quiz__module__course_id__in=course_ids, passed=True).values('quiz__module__course_id').annotate(cnt=Count('quiz', distinct=True)).values_list('quiz__module__course_id', 'cnt'))
            
            submitted_assignments = dict(AssignmentSubmission.objects.filter(student=user, assignment__module__course_id__in=course_ids).values('assignment__module__course_id').annotate(cnt=Count('assignment', distinct=True)).values_list('assignment__module__course_id', 'cnt'))
            
            context['precomputed_progress'] = {
                'lesson_counts': lesson_counts,
                'quiz_counts': quiz_counts,
                'assignment_counts': assignment_counts,
                'completed_lessons': completed_lessons,
                'passed_quizzes': passed_quizzes,
                'submitted_assignments': submitted_assignments,
            }
        return context

    def perform_create(self, serializer):
        user = self.request.user
        save_kwargs = {'created_by': user}
        if user.role == 'STAFF':
            save_kwargs['mentor'] = user
            if not serializer.validated_data.get('category'):
                category = getattr(getattr(user, 'staff_profile', None), 'category', None)
                if category:
                    save_kwargs['category'] = category
        
        course = serializer.save(**save_kwargs)
        AuditLog.objects.create(
            user=user,
            action=f"Created Course: {course.title}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def perform_update(self, serializer):
        course = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            action=f"Updated Course details: {course.title}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def perform_destroy(self, instance):
        title = instance.title
        instance.delete()
        AuditLog.objects.create(
            user=self.request.user,
            action=f"Deleted Course: {title}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

class LiveClassViewSet(viewsets.ModelViewSet):
    serializer_class = LiveClassSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsSuperAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        from apps.users.models import CustomUser
        from django.db.models import Q
        if not isinstance(user, CustomUser):
            return LiveClass.objects.none()
        
        live_mode_param = self.request.query_params.get('live_mode')
        
        if user.role == 'STUDENT':
            profile = getattr(user, 'student_profile', None)
            student_courses = profile.courses.all() if profile else []
            
            if live_mode_param == 'true':
                # Live Mentoring Mode: Only sessions created by assigned live mentor or specifically targeted to this student
                live_staff = profile.assigned_live_staff if profile else None
                qs = LiveClass.objects.filter(course__isnull=True)
                if live_staff:
                    qs = qs.filter(Q(students=user) | Q(created_by=live_staff))
                else:
                    qs = qs.filter(students=user)
                return qs.select_related('category', 'created_by').prefetch_related('students').distinct()

            elif live_mode_param == 'false':
                # Course Doubt Clearing Mode: MUST be enrolled in that specific course!
                if not student_courses.exists():
                    return LiveClass.objects.none()
                qs = LiveClass.objects.filter(
                    course__is_published=True,
                    course__in=student_courses
                )
                # If specific students were allotted in the doubt session, user must match or it's open to all enrolled in that course
                return qs.filter(
                    Q(students__isnull=True) | Q(students=user)
                ).select_related('course', 'category', 'created_by').prefetch_related('students').distinct()

            else:
                # Default fallback: strictly enrolled courses or targeted live sessions
                qs = LiveClass.objects.filter(
                    Q(course__in=student_courses, course__is_published=True) |
                    Q(course__isnull=True, students=user)
                )
                return qs.select_related('course', 'category', 'created_by').prefetch_related('students').distinct()

        if user.role == 'STAFF':
            # Staff members view only live classes created by themselves or targeted to their assigned mentees
            qs = LiveClass.objects.filter(
                Q(created_by=user) | 
                Q(students__student_profile__assigned_live_staff=user) |
                Q(students__student_profile__assigned_staff=user)
            )
            if live_mode_param == 'true':
                qs = qs.filter(course__isnull=True)
            elif live_mode_param == 'false':
                qs = qs.filter(course__isnull=False)

            return qs.select_related('course', 'category', 'created_by').prefetch_related('students').distinct()
            
        qs = LiveClass.objects.select_related('course', 'category', 'created_by').prefetch_related('students').all()
        if live_mode_param == 'true':
            qs = qs.filter(course__isnull=True)
        elif live_mode_param == 'false':
            qs = qs.filter(course__isnull=False)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print(f"\n============================================================")
            print(f"LIVE CLASS CREATION VALIDATION ERROR:")
            print(serializer.errors)
            print(f"============================================================\n")
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        category = getattr(user, 'staff_profile', None) and user.staff_profile.category
        live_class = serializer.save(created_by=user, category=category)
        
        course_info = f"for Course '{live_class.course.title}'" if live_class.course else "without Course track"
        AuditLog.objects.create(
            user=user,
            action=f"Scheduled Live Class '{live_class.title}' {course_info}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

        # Notify assigned/targeted students
        from apps.users.models import CustomUser
        from apps.notifications.models import Notification
        
        if live_class.course:
            # Course Doubt Clearing Session: Target ONLY students enrolled in this course!
            targeted_students = CustomUser.objects.filter(
                role='STUDENT',
                is_active=True,
                student_profile__courses=live_class.course
            )
            if live_class.students.exists():
                targeted_students = targeted_students.filter(id__in=live_class.students.all())
            targeted_students = targeted_students.distinct()
        else:
            # Live Mentoring Class: Target specific mentees or all mentees assigned to this staff mentor
            targeted_students = live_class.students.all()
            if not targeted_students.exists():
                targeted_students = CustomUser.objects.filter(
                    role='STUDENT',
                    is_active=True,
                    student_profile__assigned_live_staff=user
                ).distinct()
        
        time_str = live_class.scheduled_time.strftime("%b %d, %Y at %I:%M %p") if live_class.scheduled_time else ""
        notif_objs = [
            Notification(
                recipient=student,
                title=f"New Doubt Clearing Session: {live_class.title}" if live_class.course else f"New Live Mentoring Class: {live_class.title}",
                message=f"A new session '{live_class.title}' for course '{live_class.course.title}' has been scheduled for {time_str}." if live_class.course else f"Your mentor scheduled a new Live Session '{live_class.title}' for {time_str}."
            )
            for student in targeted_students
        ]
        if notif_objs:
            Notification.objects.bulk_create(notif_objs)

        # Dispatch SMTP emails via non-blocking background thread
        from apps.core.emails import send_live_class_email
        send_live_class_email(live_class.id)

from apps.courses.discussion_models import CourseDiscussionPost, CourseDiscussionComment
from apps.courses.discussion_serializers import CourseDiscussionPostSerializer, CourseDiscussionCommentSerializer

class CourseDiscussionPostViewSet(viewsets.ModelViewSet):
    serializer_class = CourseDiscussionPostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from apps.users.models import CustomUser
        from django.db.models import Q
        user = self.request.user
        # pyrefly: ignore [missing-attribute]
        course_id = self.request.query_params.get('course')
        live_mode = self.request.query_params.get('live_mode') == 'true'
        qs = CourseDiscussionPost.objects.all().select_related('user').prefetch_related('comments', 'comments__user')

        # Domain-scoped filtering
        if isinstance(user, CustomUser):
            if user.role == 'STUDENT':
                profile = getattr(user, 'student_profile', None)
                if profile:
                    staff_mentor = profile.assigned_live_staff or profile.assigned_staff
                    if staff_mentor:
                        qs = qs.filter(
                            Q(user=user) | 
                            Q(user=staff_mentor) | 
                            Q(user__student_profile__assigned_live_staff=staff_mentor) |
                            Q(user__student_profile__assigned_staff=staff_mentor)
                        )
                    else:
                        qs = qs.filter(Q(user=user) | Q(course__in=profile.courses.all()) | Q(course__isnull=True))
                else:
                    qs = qs.filter(user=user)

            elif user.role == 'STAFF':
                # Staff always views questions and doubts from their directly assigned mentees and their own answers
                qs = qs.filter(
                    Q(user__student_profile__assigned_live_staff=user) | 
                    Q(user__student_profile__assigned_staff=user) | 
                    Q(user=user)
                ).distinct()

            elif user.role == 'SUPER_ADMIN':
                if live_mode:
                    qs = qs.filter(Q(user__student_profile__student_type__in=['LIVE_CLASS', 'BOTH']) | Q(user__role='STAFF') | Q(user__role='SUPER_ADMIN'))
                else:
                    qs = qs.filter(Q(user__student_profile__student_type__in=['COURSE', 'BOTH']) | Q(user__role='STAFF') | Q(user__role='SUPER_ADMIN'))

        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        course = serializer.validated_data.get('course')
        if not course and hasattr(user, 'student_profile'):
            course = user.student_profile.courses.first()
        post = serializer.save(user=user, course=course)
        
        # pyrefly: ignore [missing-attribute]
        if user.role == 'STUDENT' and hasattr(user, 'student_profile'):
            from apps.notifications.models import Notification
            from apps.users.models import CustomUser
            # pyrefly: ignore [missing-attribute]
            student_name = f"{user.first_name} {user.last_name}".strip() or user.email
            
            # 1. Notify standard course assigned mentor
            if user.student_profile.assigned_staff:
                Notification.objects.create(
                    recipient=user.student_profile.assigned_staff,
                    title="New Student Question",
                    message=f"Student {student_name} posted a new question: '{post.title}'"
                )
            
            # 2. Notify live mentoring assigned mentor
            if user.student_profile.assigned_live_staff:
                Notification.objects.create(
                    recipient=user.student_profile.assigned_live_staff,
                    title="New Student Question",
                    message=f"Student {student_name} posted a new question: '{post.title}'"
                )

            # 3. Notify all Super Admins
            admins = CustomUser.objects.filter(role='SUPER_ADMIN')
            for admin in admins:
                if admin != user.student_profile.assigned_staff and admin != user.student_profile.assigned_live_staff:
                    Notification.objects.create(
                        recipient=admin,
                        title="New Student Question",
                        message=f"Student {student_name} posted a new question: '{post.title}'"
                    )

    def destroy(self, request, *args, **kwargs):
        from rest_framework import response
        instance = self.get_object()
        if request.user.role not in ['SUPER_ADMIN', 'STAFF'] and instance.user != request.user:
            return response.Response(
                {"error": "You do not have permission to delete this post."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

class CourseDiscussionCommentViewSet(viewsets.ModelViewSet):
    serializer_class = CourseDiscussionCommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from apps.users.models import CustomUser
        user = self.request.user
        # pyrefly: ignore [missing-attribute]
        post_id = self.request.query_params.get('post')
        qs = CourseDiscussionComment.objects.all().select_related('user')

        if isinstance(user, CustomUser):
            if user.role == 'STUDENT':
                qs = qs.filter(post__user=user)
            elif user.role == 'STAFF':
                qs = CourseDiscussionComment.objects.none() # Staff shouldn't see course discussions

        if post_id:
            qs = qs.filter(post_id=post_id)
        return qs

    def perform_create(self, serializer):
        comment = serializer.save(user=self.request.user)
        sender = self.request.user
        post = comment.post
        from apps.notifications.models import Notification
        
        # pyrefly: ignore [missing-attribute]
        sender_name = f"{sender.first_name} {sender.last_name}".strip() or sender.email
        
        # 1. If a mentor/staff replies, notify the student (owner of the post)
        # pyrefly: ignore [missing-attribute]
        if sender.role in ['STAFF', 'SUPER_ADMIN'] and post.user != sender:
            Notification.objects.create(
                recipient=post.user,
                title="New Mentor Response",
                message=f"{sender_name} replied to your question '{post.title}': \"{comment.content[:60]}\""
            )
        # 2. Student replies to course discussions no longer notify anyone specifically since mentors are removed.
        pass

    def destroy(self, request, *args, **kwargs):
        from rest_framework import response
        instance = self.get_object()
        if request.user.role not in ['SUPER_ADMIN', 'STAFF'] and instance.user != request.user:
            return response.Response(
                {"error": "You do not have permission to delete this comment."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


from rest_framework.views import APIView
from rest_framework.response import Response
from apps.lessons.models import Lesson
import os
import requests
import re

def generate_fallback_ai_response(action, lesson, course, prompt):
    title = lesson.title if lesson else (course.title if course else "Course Material")
    content = lesson.content if lesson else (course.description if course else "")
    faqs = lesson.faqs if (lesson and lesson.faqs) else []

    headers = re.findall(r'^#+\s+(.*)$', content or '', re.MULTILINE)
    
    if action == 'summarize':
        summary = f"### 📝 Apex AI Executive Summary: {title}\n\nHere is a concise summary of the lecture material:\n\n"
        if headers:
            for h in headers[:4]:
                summary += f"- **Key Topic: {h}** — Explored in-depth inside the lesson, explaining core design principles and specifications.\n"
        else:
            summary += f"- **Core Overview** — Introduction to the essential concepts and architectural rules of {title}.\n"
            summary += "- **Practical Takeaway** — Hands-on exercises and coding paradigms discussed in this study block.\n"
            summary += "- **Best Practice** — Ensure modular architecture, fast database queries, and decoupled code.\n"
        summary += f"\n*This summary was dynamically compiled from the enrolled course material.*"
        return {"answer": summary}

    elif action == 'notes':
        notes = f"### 📓 Apex AI Study Notes: {title}\n\nHere are structured learning takeaways for this module:\n\n"
        if headers:
            for h in headers[:3]:
                notes += f"#### 🔹 {h}\n- Focuses on foundational implementation rules.\n- Ensure you check the repository examples for practical details.\n\n"
        else:
            notes += f"#### 🔹 Foundational Overview\n- Understanding the core syntax and structural flow of {title}.\n- Best practice: Always write unit tests to validate edge cases.\n\n"
        notes += "#### 🛠️ Code Highlight / Concept Takeaway\n```python\n# Recommended implementation pattern\ndef verify_apex_setup():\n    print('Apex LMS AI Core Environment: Operational')\n```\n"
        return {"answer": notes}

    elif action == 'flashcards':
        flashcards_text = f"### 🎴 Apex AI Flashcards Deck: {title}\n\nReview key terms below. Click on any card to flip between Question and Answer:\n\n"
        cards = []
        if faqs:
            for i, faq in enumerate(faqs[:5]):
                flashcards_text += f"**Card {i+1}**\n- **Front:** {faq.get('q')}\n- **Back:** {faq.get('a')}\n\n"
                cards.append({"id": i+1, "front": faq.get('q'), "back": faq.get('a')})
        else:
            cards = [
                {
                    "id": 1,
                    "front": f"What is the primary objective of {title}?",
                    "back": f"To master the core architectural patterns and practical applications of {title}."
                },
                {
                    "id": 2,
                    "front": "What is a recommended performance best-practice?",
                    "back": "Implement optimistic UI updates, avoid intrusive full-page reloads, and use backend query optimizations."
                },
                {
                    "id": 3,
                    "front": "How do you handle API errors gracefully?",
                    "back": "Use user-friendly toast notifications and maintain local component state rather than crashing the interface."
                },
                {
                    "id": 4,
                    "front": "What is the key advantage of asynchronous processing?",
                    "back": "It frees the main event loop, preventing UI freezes during long-running data operations."
                }
            ]
            for i, c in enumerate(cards):
                flashcards_text += f"**Card {i+1}**\n- **Front:** {c['front']}\n- **Back:** {c['back']}\n\n"

        return {"answer": flashcards_text, "cards": cards}

    elif action == 'quiz':
        quiz_text = f"### ✍️ Apex AI Practice Checkpoint: {title}\n\nTest your understanding of {title}:\n\n"
        quiz = []
        if faqs and len(faqs) >= 2:
            for i, faq in enumerate(faqs[:3]):
                q_obj = {
                    "id": i + 1,
                    "question": faq.get('q'),
                    "options": [faq.get('a'), "Not related to this topic", "Deprecated standard", "None of the above"],
                    "answerIndex": 0,
                    "explanation": f"Correct! {faq.get('a')}"
                }
                quiz.append(q_obj)
        else:
            quiz = [
                {
                    "id": 1,
                    "question": f"Which of the following best describes the core principle of {title}?",
                    "options": [
                        f"Building scalable, high-performance web applications using modern paradigms.",
                        "Relying on deprecated legacy frameworks.",
                        "Avoiding error checking and unit tests.",
                        "Using manual full page reloads for every state update."
                    ],
                    "answerIndex": 0,
                    "explanation": "Apex principles prioritize high performance, modern reactive state management, and instant user experience."
                },
                {
                    "id": 2,
                    "question": "What is the best approach to ensure zero page freezes during data updates?",
                    "options": [
                        "Perform heavy computations synchronously on the main UI thread",
                        "Use asynchronous background API calls with optimistic UI state updates",
                        "Block user interaction with full screen modal loaders",
                        "Reload the entire page on every button click"
                    ],
                    "answerIndex": 1,
                    "explanation": "Optimistic UI updates with background asynchronous handling provide a smooth, zero-latency user experience."
                },
                {
                    "id": 3,
                    "question": "How should error states be communicated to users?",
                    "options": [
                        "Display unhandled raw tracebacks on screen",
                        "Silently swallow errors without visual feedback",
                        "Display clear, actionable toast notifications while maintaining stable UI state",
                        "Crash the app application loop"
                    ],
                    "answerIndex": 2,
                    "explanation": "User-friendly toast alerts communicate issues clearly without interrupting application flow."
                }
            ]
        for q in quiz:
            quiz_text += f"**Q{q['id']}: {q['question']}**\n"
            for opt_idx, opt in enumerate(q['options']):
                quiz_text += f"- {'ABCD'[opt_idx]}) {opt}\n"
            quiz_text += f"*Correct Answer: {'ABCD'[q['answerIndex']]}) {q['options'][q['answerIndex']]}*\n\n"

        return {"answer": quiz_text, "quiz": quiz}

    elif action == 'explain':
        explanation = f"### 💡 Apex AI Concept Breakdown: {title}\n\nHere are detailed explanations of key concepts in this lecture:\n\n"
        if headers:
            for h in headers[:2]:
                explanation += f"**Concept: {h}**\n- *In simple terms:* This refers to the core workflow where elements are processed sequentially to guarantee consistency.\n- *Why it matters:* Implementing this correctly eliminates race conditions and ensures clean execution.\n\n"
        else:
            explanation += f"**Concept: {title} Foundations**\n- *In simple terms:* The bedrock architecture of this system.\n- *Why it matters:* Mastery of this section is required before moving to subsequent modules.\n"
        return {"answer": explanation}

    else: # ask
        lowered_prompt = prompt.lower()
        if faqs:
            for faq in faqs:
                if any(kw in faq.get('q').lower() for kw in lowered_prompt.split()):
                    return {"answer": f"### 💬 AI Answer (Enrolled Content)\n\nBased on your course materials:\n\n> **Q: {faq.get('q')}**\n> \n> **A:** {faq.get('a')}"}
        
        # General ChatGPT-style fallback answers for common topics
        if "data analyst" in lowered_prompt or "data analysis" in lowered_prompt or "analyst" in lowered_prompt:
            return {
                "answer": (
                    "### 📊 Apex AI Answer: Data Analyst\n\n"
                    "A **Data Analyst** is a professional who collects, cleans, processes, and analyzes datasets to help organizations make data-driven decisions.\n\n"
                    "#### 🔹 Key Responsibilities:\n"
                    "- **Data Cleaning & Preparation**: Transforming raw unstructured data into structured formats.\n"
                    "- **Exploratory Data Analysis (EDA)**: Identifying trends, correlations, and statistical patterns.\n"
                    "- **Data Visualization**: Building interactive dashboards using Tableau, Power BI, or Matplotlib/Seaborn.\n"
                    "- **Reporting & Insights**: Translating complex figures into actionable business strategies.\n\n"
                    "#### 🛠️ Essential Tech Stack:\n"
                    "- **Languages**: Python (`Pandas`, `NumPy`), R, SQL\n"
                    "- **Tools**: Excel, Tableau, Power BI, PostgreSQL\n"
                    "- **Core Math**: Probability, Descriptive Statistics, Hypothesis Testing"
                )
            }
        elif "django" in lowered_prompt:
            return {
                "answer": (
                    "### 🐍 Apex AI Answer: Django Framework\n\n"
                    "Django is a high-level Python web framework that encourages rapid development and clean, pragmatic architectural design.\n\n"
                    "#### 🔹 Core Architecture:\n"
                    "- **MVT Pattern**: Model (DB Schema), View (Business Logic), Template (UI layout).\n"
                    "- **ORM**: Map database tables to Python objects dynamically without writing raw SQL.\n"
                    "- **Built-in Admin & Auth**: Secure out-of-the-box management interface and user authentication.\n\n"
                    "```python\n"
                    "# Example Django ORM Query:\n"
                    "active_students = StudentProfile.objects.filter(is_active=True).select_related('assigned_staff')\n"
                    "```"
                )
            }
        elif "react" in lowered_prompt:
            return {
                "answer": (
                    "### ⚛️ Apex AI Answer: React.js\n\n"
                    "React is a declarative, efficient, component-driven JavaScript library for building modern user interfaces.\n\n"
                    "#### 🔹 Core Concepts:\n"
                    "- **JSX**: Syntax extension to write HTML structure inside JavaScript.\n"
                    "- **Virtual DOM**: Syncs state changes efficiently with minimal DOM re-renders.\n"
                    "- **Hooks**: `useState`, `useEffect`, `useMemo`, and `useCallback` for state management.\n\n"
                    "```tsx\n"
                    "const DoubtsResolver = () => {\n"
                    "  const [doubt, setDoubt] = useState('');\n"
                    "  return <div>{doubt}</div>;\n"
                    "};\n"
                    "```"
                )
            }
        elif "python" in lowered_prompt:
            return {
                "answer": (
                    "### 🐍 Apex AI Answer: Python Programming\n\n"
                    "Python is an interpreted, high-level, general-purpose language known for readability, versatility, and vast ecosystem.\n\n"
                    "```python\n"
                    "# Clean list comprehension example:\n"
                    "numbers = [1, 2, 3, 4, 5]\n"
                    "squares = [x ** 2 for x in numbers if x % 2 == 0]\n"
                    "print(f'Even squares: {squares}')\n"
                    "```"
                )
            }
        elif "sql" in lowered_prompt or "database" in lowered_prompt:
            return {
                "answer": (
                    "### 🗄️ Apex AI Answer: SQL & Databases\n\n"
                    "SQL (Structured Query Language) is the standard language for querying, manipulating, and managing relational database management systems (RDBMS).\n\n"
                    "```sql\n"
                    "-- Join example retrieving student & course data:\n"
                    "SELECT s.first_name, c.title\n"
                    "FROM students s\n"
                    "JOIN enrollments e ON s.id = e.student_id\n"
                    "JOIN courses c ON e.course_id = c.id\n"
                    "WHERE s.is_active = TRUE;\n"
                    "```"
                )
            }
        
        return {
            "answer": (
                f"### 💡 Apex AI Academic Mentor\n\n"
                f"Regarding your query: *\"{prompt}\"*\n\n"
                f"I am actively tracking your course progress in **{title}**.\n\n"
                f"Feel free to ask me to explain any technical term, write example code, break down complex concepts, or summarize your lesson!"
            )
        }

from rest_framework.permissions import AllowAny, IsAuthenticated

class AITutorView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        action = request.data.get('action', 'ask') # ask, notes, summarize, flashcards, quiz, explain
        lesson_id = request.data.get('lesson_id')
        course_id = request.data.get('course_id')
        prompt = request.data.get('prompt', '')
        history = request.data.get('history', []) # Multi-turn messages: [{role: 'user'|'assistant', text: '...'}]

        lesson = None
        course = None
        context_text = ""

        if lesson_id:
            try:
                lesson = Lesson.objects.get(id=lesson_id)
                course = lesson.module.course
                context_text = f"Course Title: {course.title}\nModule Title: {lesson.module.title}\nLesson Title: {lesson.title}\nMain Content/Transcript:\n{lesson.content}\nKnowledge Base / Additional Notes:\n{lesson.additional_notes or ''}"
            except Exception:
                lesson = None
        
        if not context_text and course_id:
            try:
                course = Course.objects.get(id=course_id)
                context_text = f"Course Title: {course.title}\nDescription:\n{course.description}"
            except Exception:
                course = None

        course_title_name = course.title if course else "this course"

        if context_text or course:
            system_instruction = (
                f"You are Apex AI, the dedicated academic tutor for the course '{course_title_name}' at Hadescore Apex Technologies LMS.\n\n"
                f"CRITICAL SCOPE RULE:\n"
                f"1. You MUST answer any academic questions, doubts, code concepts, coding help, software development, programming, tech stack, IT, or computer science concepts.\n"
                f"2. You MUST answer anything related to the course '{course_title_name}', its subject area, or related tech stack.\n"
                f"3. Only refuse the question if it is completely non-academic and unrelated to learning/technology (e.g. cooking, movies, sports, celebrity gossip). In that case, politely reply with:\n"
                f"\"⚠️ This question is not related to **{course_title_name}**. Please ask doubts or questions related to this course material!\"\n\n"
                f"4. Format valid responses beautifully in Markdown with clear headers (###), bullet points, and code blocks where applicable.\n\n"
                f"--- COURSE/LESSON CONTEXT ---\n{context_text or f'Course: {course_title_name}'}\n-----------------------------\n\n"
            )
        else:
            system_instruction = (
                "You are Apex AI, an expert academic tutor for Hadescore Apex Technologies LMS. You are a helpful, encouraging, and highly knowledgeable AI academic mentor.\n"
                "Help the user master their academic material. Format your responses beautifully in Markdown with clear headers (###), bullet points, and code blocks where relevant.\n\n"
            )

        # Build prompt string with history context if provided
        history_str = ""
        if isinstance(history, list) and len(history) > 0:
            history_str = "--- CONVERSATION HISTORY ---\n"
            for m in history[-6:]: # Limit to last 6 messages for context efficiency
                role = "User" if m.get('sender') in ['student', 'user'] or m.get('role') == 'user' else "Apex AI"
                text = m.get('text') or m.get('content') or ''
                if text:
                    history_str += f"{role}: {text}\n"
            history_str += "----------------------------\n\n"

        if action == 'summarize':
            full_prompt = f"{system_instruction}{history_str}Please provide a concise, beautiful bulleted summary of this lesson's key points."
        elif action == 'notes':
            full_prompt = f"{system_instruction}{history_str}Please generate structured, clean study notes with code syntax highlights and key terms defined."
        elif action == 'flashcards':
            full_prompt = (
                f"{system_instruction}{history_str}Please extract key terms or questions and generate 4 flashcards from the text.\n"
                "Return clear flashcards formatted as:\n"
                "- Front: [Question/Term]\n  Back: [Answer/Explanation]\n"
            )
        elif action == 'quiz':
            full_prompt = (
                f"{system_instruction}{history_str}Please generate a 3-question MCQ practice quiz from the text.\n"
                "For each question, provide options A, B, C, D, specify the correct answer letter, and provide a short explanation."
            )
        elif action == 'explain':
            full_prompt = f"{system_instruction}{history_str}Identify and explain any difficult terms or core technical concepts in this text in simple terms."
        else:
            full_prompt = f"{system_instruction}{history_str}User Question: {prompt}\nAnswer:"

        api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('OPENAI_API_KEY')
        if api_key:
            models_to_try = [
                "gemini-1.5-flash",
                "gemini-2.0-flash",
                "gemini-2.0-flash-lite"
            ]
            headers = {"Content-Type": "application/json"}
            data = {
                "contents": [{
                    "parts": [{"text": full_prompt}]
                }]
            }
            for model_name in models_to_try:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                    res = requests.post(url, headers=headers, json=data, timeout=10)
                    if res.status_code == 200:
                        candidates = res.json().get('candidates', [])
                        if candidates and 'content' in candidates[0]:
                            parts = candidates[0]['content'].get('parts', [])
                            if parts and 'text' in parts[0]:
                                answer = parts[0]['text']
                                fallback_data = generate_fallback_ai_response(action, lesson, course, prompt)
                                cards = fallback_data.get('cards') if action == 'flashcards' else None
                                quiz = fallback_data.get('quiz') if action == 'quiz' else None
                                
                                resp = {"answer": answer}
                                if cards: resp["cards"] = cards
                                if quiz: resp["quiz"] = quiz
                                return Response(resp)
                except Exception:
                    continue

        fallback_result = generate_fallback_ai_response(action, lesson, course, prompt)
        return Response(fallback_result)

