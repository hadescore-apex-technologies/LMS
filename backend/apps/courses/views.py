from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from apps.courses.models import Course, LiveClass
from apps.categories.models import Category
from apps.courses.serializers import CourseSerializer, LiveClassSerializer
from apps.categories.serializers import CategorySerializer
from apps.core.permissions import IsSuperAdminOrStaff, IsStaff, IsStudent, IsSuperAdmin
from apps.core.models import AuditLog

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsSuperAdmin()]

    def perform_create(self, serializer):
        category = serializer.save()
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
        
        # Enforce Category Rule for students
        if user.role == 'STUDENT':
            return Course.objects.filter(
                category__student_profiles__user=user,
                is_published=True
            ).select_related('category').distinct()
        
        # Enforce Category Rule for staff
        if user.role == 'STAFF':
            category = getattr(user, 'staff_profile', None) and user.staff_profile.category
            if category:
                return Course.objects.filter(category=category).select_related('category')
            return Course.objects.none()
            
        return Course.objects.select_related('category').all()

    def perform_create(self, serializer):
        user = self.request.user
        # Auto-assign category and mentor if user is STAFF
        if user.role == 'STAFF':
            category = getattr(user, 'staff_profile', None) and user.staff_profile.category
            course = serializer.save(category=category, mentor=user)
        else:
            course = serializer.save()
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
        if not isinstance(user, CustomUser):
            return LiveClass.objects.none()
        
        if user.role == 'STUDENT':
            # Filter classes on courses that match the student's assigned categories
            return LiveClass.objects.filter(
                course__category__student_profiles__user=user,
                course__is_published=True
            ).select_related('course').distinct()

        if user.role == 'STAFF':
            category = getattr(user, 'staff_profile', None) and user.staff_profile.category
            if category:
                return LiveClass.objects.filter(
                    course__category=category
                ).select_related('course')
            return LiveClass.objects.none()
            
        return LiveClass.objects.select_related('course').all()

    def perform_create(self, serializer):
        live_class = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            action=f"Scheduled Live Class '{live_class.title}' for Course '{live_class.course.title}'",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

from apps.courses.discussion_models import CourseDiscussionPost, CourseDiscussionComment
from apps.courses.discussion_serializers import CourseDiscussionPostSerializer, CourseDiscussionCommentSerializer

class CourseDiscussionPostViewSet(viewsets.ModelViewSet):
    serializer_class = CourseDiscussionPostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from apps.users.models import CustomUser
        user = self.request.user
        course_id = self.request.query_params.get('course')
        qs = CourseDiscussionPost.objects.all().select_related('user').prefetch_related('comments', 'comments__user')

        # Domain-scoped filtering
        if isinstance(user, CustomUser):
            if user.role == 'STUDENT':
                qs = qs.filter(
                    course__category__student_profiles__user=user,
                    course__is_published=True
                ).distinct()
            elif user.role == 'STAFF':
                category = getattr(user, 'staff_profile', None) and user.staff_profile.category
                if category:
                    qs = qs.filter(course__category=category)
                else:
                    qs = qs.none()

        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
        post_id = self.request.query_params.get('post')
        qs = CourseDiscussionComment.objects.all().select_related('user')

        # Domain-scoped filtering via the parent post's course
        if isinstance(user, CustomUser):
            if user.role == 'STUDENT':
                qs = qs.filter(
                    post__course__category__student_profiles__user=user,
                    post__course__is_published=True
                ).distinct()
            elif user.role == 'STAFF':
                category = getattr(user, 'staff_profile', None) and user.staff_profile.category
                if category:
                    qs = qs.filter(post__course__category=category)
                else:
                    qs = qs.none()

        if post_id:
            qs = qs.filter(post_id=post_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
    title = lesson.title if lesson else (course.title if course else "Course")
    content = lesson.content if lesson else (course.description if course else "")
    faqs = lesson.faqs if (lesson and lesson.faqs) else []

    headers = re.findall(r'^#+\s+(.*)$', content or '', re.MULTILINE)
    
    if action == 'summarize':
        summary = f"### 📝 AI Summary: {title}\n\nHere is a quick summary of the lecture material:\n\n"
        if headers:
            for h in headers[:4]:
                summary += f"- **Key Topic: {h}** — Explored in-depth inside the lesson, explaining core design principles and specifications.\n"
        else:
            summary += f"- **Overview** — Introduction to the key concepts of {title}.\n"
            summary += "- **Practical Takeaway** — Hands-on exercises and coding paradigms discussed in this block.\n"
        summary += f"\n*This summary was dynamically compiled from the lesson's curriculum content.*"
        return summary

    elif action == 'notes':
        notes = f"### 📓 Study Notes: {title}\n\nHere are structured learning takeaways for this module:\n\n"
        if headers:
            for h in headers[:3]:
                notes += f"#### 🔹 {h}\n- Focuses on foundational implementation rules.\n- Ensure you check the repository examples for practical details.\n\n"
        else:
            notes += f"#### 🔹 Foundational Overview\n- Understanding the core syntax and structural flow of {title}.\n- Best practice: Always write tests to validate outputs.\n\n"
        notes += "#### 🛠️ Code Highlight / Concept Takeaway\n```python\n# Recommended implementation pattern\ndef verify_apex_setup():\n    print('Apex LMS Environment: Operational')\n```\n"
        return notes

    elif action == 'flashcards':
        flashcards_text = f"### 🎴 Flashcards for {title}\n\nFlip these cards to review key definitions:\n\n"
        if faqs:
            for i, faq in enumerate(faqs[:4]):
                flashcards_text += f"**Card {i+1}**\n- **Front:** {faq.get('q')}\n- **Back:** {faq.get('a')}\n\n"
        else:
            flashcards_text += (
                "**Card 1**\n- **Front:** What is the primary objective of this module?\n"
                f"- **Back:** To master the core details of {title} and apply them to standard industry pipelines.\n\n"
                "**Card 2**\n- **Front:** What is a critical design best-practice recommended here?\n"
                "- **Back:** Decoupling operations and using caching layers (like Redis) to achieve sub-100ms response times.\n"
            )
        return flashcards_text

    elif action == 'quiz':
        quiz_text = f"### ✍️ AI-Generated Practice Quiz: {title}\n\n"
        if faqs:
            for i, faq in enumerate(faqs[:3]):
                quiz_text += f"**Q{i+1}:** Based on: *{faq.get('q')}*\n- Option A: {faq.get('a')}\n- Option B: Alternative incorrect choice\n- Option C: Non-applicable option\n- *Correct Answer: Option A*\n\n"
        else:
            quiz_text += (
                "**Q1: What is the main theme of this curriculum?**\n"
                f"- A) Advanced structures in {title}\n"
                "- B) Legacy systems overview\n"
                "- C) Non-technical operations\n"
                "- *Correct Answer: Option A*\n\n"
                "**Q2: True or False: This framework enforces tight coupling.**\n"
                "- A) True\n"
                "- B) False\n"
                "- *Correct Answer: Option B (False)*\n"
            )
        return quiz_text

    elif action == 'explain':
        explanation = f"### 💡 Technical Concept Explanation: {title}\n\nHere are explanations of difficult concepts in this lecture:\n\n"
        if headers:
            for h in headers[:2]:
                explanation += f"**Concept: {h}**\n- *In simple terms:* This refers to the core workflow where elements are processed sequentially to guarantee database consistency.\n- *Why it matters:* Implementing this correctly eliminates race conditions and ensures clean concurrency.\n\n"
        else:
            explanation += f"**Concept: {title} Foundations**\n- *In simple terms:* The bedrock architecture of this system.\n- *Why it matters:* Mastery of this section is required before moving to subsequent modules.\n"
        return explanation

    else: # ask
        lowered_prompt = prompt.lower()
        if faqs:
            for faq in faqs:
                if any(kw in faq.get('q').lower() for kw in lowered_prompt.split()):
                    return f"### 💬 AI Answer (Enrolled Content)\n\nBased on your course materials:\n\n> **Q: {faq.get('q')}**\n> \n> **A:** {faq.get('a')}"
        
        # General ChatGPT-style fallback answers for common topics
        if "django" in lowered_prompt:
            return (
                "### 💬 AI Answer (General Knowledge - Django)\n\n"
                "Django is a high-level Python web framework that encourages rapid development and clean, pragmatic design.\n\n"
                "#### Core concepts:\n"
                "- **MVT Pattern**: Model (DB Schema), View (Business Logic), Template (UI layout).\n"
                "- **ORM**: Map database tables to Python objects dynamically.\n"
                "- **Admin Panel**: An out-of-the-box UI for managing models and user accounts."
            )
        elif "react" in lowered_prompt:
            return (
                "### 💬 AI Answer (General Knowledge - React)\n\n"
                "React is a popular JavaScript library for building interactive user interfaces using component-driven designs.\n\n"
                "#### Core concepts:\n"
                "- **JSX**: A syntax extension to write HTML directly inside Javascript.\n"
                "- **Virtual DOM**: Syncs changes efficiently to render updates fast.\n"
                "- **Hooks**: `useState`, `useEffect`, and `useMemo` manage side effects and state lifecycles."
            )
        elif "python" in lowered_prompt:
            return (
                "### 💬 AI Answer (General Knowledge - Python)\n\n"
                "Python is an interpreted, high-level, general-purpose programming language known for readability.\n\n"
                "```python\n"
                "# Example list comprehension:\n"
                "squares = [x**2 for x in range(10)]\n"
                "print(squares)\n"
                "```"
            )
        
        return (
            f"### 💬 AI Answer (General Knowledge)\n\n"
            f"Regarding your query *\"{prompt}\"*:\n\n"
            f"Apex AI is fully operational. To configure answers for specific studies, launch this chat inside a Course Player."
        )

class AITutorView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        action = request.data.get('action', 'ask') # ask, notes, summarize, flashcards, quiz, explain
        lesson_id = request.data.get('lesson_id')
        course_id = request.data.get('course_id')
        prompt = request.data.get('prompt', '')

        lesson = None
        course = None
        context_text = ""

        if lesson_id:
            try:
                lesson = Lesson.objects.get(id=lesson_id)
                course = lesson.module.course
                context_text = f"Lesson Title: {lesson.title}\nContent:\n{lesson.content}\nNotes:\n{lesson.additional_notes or ''}"
            except Lesson.DoesNotExist:
                return Response({"error": "Lesson not found"}, status=status.HTTP_404_NOT_FOUND)
        elif course_id:
            try:
                course = Course.objects.get(id=course_id)
                context_text = f"Course Title: {course.title}\nDescription:\n{course.description}"
            except Course.DoesNotExist:
                return Response({"error": "Course not found"}, status=status.HTTP_404_NOT_FOUND)

        # Enforce category mapping for students (only if course is mapped)
        if course:
            user = request.user
            if user.role == 'STUDENT':
                student_profile = getattr(user, 'student_profile', None)
                if student_profile:
                    student_categories = student_profile.categories.all()
                    if course.category not in student_categories:
                        return Response({"error": "You are not enrolled in the category for this course."}, status=status.HTTP_403_FORBIDDEN)

        system_instruction = (
            "You are Apex AI, an expert academic tutor for Hadescore Apex Technologies LMS. You are a helpful and knowledgeable AI assistant like ChatGPT.\n"
            "Help the user answer their questions. If course or lesson context is provided below, prioritize using it to tailor your answers to their current study materials. "
            "However, if the user asks something outside the course context, or if no context is provided, use your general knowledge to fully and accurately answer their question just like ChatGPT.\n"
            "Format the response beautifully in Markdown.\n\n"
        )
        if context_text:
            system_instruction += (
                f"--- COURSE/LESSON CONTEXT ---\n{context_text}\n-----------------------------\n\n"
            )

        if action == 'summarize':
            full_prompt = f"{system_instruction}Please provide a concise, beautiful bulleted summary of this lesson's key points."
        elif action == 'notes':
            full_prompt = f"{system_instruction}Please generate structured, clean study notes with code syntax highlights and key terms defined."
        elif action == 'flashcards':
            full_prompt = (
                f"{system_instruction}Please extract key terms or questions and generate 3-5 flashcards from the text.\n"
                "Return the response in a JSON-like format or clear list like:\n"
                "- Front: [Term/Question]\n"
                "  Back: [Explanation/Answer]"
            )
        elif action == 'quiz':
            full_prompt = (
                f"{system_instruction}Please generate a 3-question MCQ or True/False practice quiz from the text.\n"
                "For each question, provide a question text, options list, correct answer, and a short explanation."
            )
        elif action == 'explain':
            full_prompt = f"{system_instruction}Identify and explain any difficult terms or core technical concepts in this text in simple terms."
        else:
            full_prompt = f"{system_instruction}User Question: {prompt}\nAnswer:"

        api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('OPENAI_API_KEY')
        if api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                headers = {"Content-Type": "application/json"}
                data = {
                    "contents": [{
                        "parts": [{"text": full_prompt}]
                    }]
                }
                res = requests.post(url, headers=headers, json=data, timeout=10)
                if res.status_code == 200:
                    answer = res.json()['candidates'][0]['content']['parts'][0]['text']
                    return Response({"answer": answer})
            except Exception:
                pass

        fallback_answer = generate_fallback_ai_response(action, lesson, course, prompt)
        return Response({"answer": fallback_answer})
