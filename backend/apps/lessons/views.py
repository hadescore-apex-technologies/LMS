from rest_framework import viewsets, decorators, response, status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Prefetch
from apps.lessons.models import Lesson, LessonBookmark, LessonNote, LessonProgress
from apps.lessons.serializers import LessonSerializer, LessonBookmarkSerializer, LessonNoteSerializer
from apps.core.permissions import IsSuperAdminOrStaff

class LessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'log_progress']:
            return [IsAuthenticated()]
        return [IsSuperAdminOrStaff()]

    def get_queryset(self):
        from typing import cast
        from rest_framework.request import Request
        
        request = cast(Request, self.request)
        module_id = request.query_params.get('module')
        course_id = request.query_params.get('course')
        user = request.user
        from apps.users.models import CustomUser
        if not isinstance(user, CustomUser):
            return Lesson.objects.none()

        # Build basic queryset with select_related for video and module hierarchy
        qs = Lesson.objects.select_related('video', 'module', 'module__course', 'module__course__category')

        # Prefetch progress records for this student to avoid N+1 queries in the serializer
        qs = qs.prefetch_related(
            Prefetch(
                'progress_records',
                queryset=LessonProgress.objects.filter(student=user),
                to_attr='user_progress'
            )
        )

        if user.role == 'STUDENT':
            profile = getattr(user, 'student_profile', None)
            student_courses = list(profile.courses.all()) if profile else []
            staff = (profile.assigned_staff or profile.assigned_live_staff) if profile else None
            staff_cat = getattr(getattr(staff, 'staff_profile', None), 'category', None)
            
            qs = qs.filter(module__course__is_published=True)
            if student_courses or staff_cat or staff:
                from django.db.models import Q
                filters = Q()
                if student_courses:
                    filters |= Q(module__course__in=student_courses)
                if staff_cat:
                    filters |= Q(module__course__category=staff_cat)
                if staff:
                    filters |= Q(module__course__mentor=staff)
                qs = qs.filter(filters).distinct()
        elif user.role == 'STAFF':
            category = getattr(user, 'staff_profile', None) and user.staff_profile.category
            if category:
                qs = qs.filter(module__course__category=category)

        if module_id:
            qs = qs.filter(module_id=module_id)
        if course_id:
            qs = qs.filter(module__course_id=course_id)
            
        return qs

    @decorators.action(detail=True, methods=['post'], url_path='progress')
    def log_progress(self, request, pk=None):
        lesson = self.get_object()
        user = request.user
        
        completed = request.data.get('completed', False)
        resume_time = request.data.get('resume_time', 0.0)
        watch_percentage = request.data.get('watch_percentage', 0.0)
        watch_time = request.data.get('watch_time', 0)
        
        from apps.lessons.models import LessonProgress as LP
        from django.utils import timezone
        
        # If the lesson progress was already completed, keep it completed
        already_completed = LP.objects.filter(student=user, lesson=lesson, completed=True).exists()
        has_video = bool(getattr(lesson, 'video', None) or getattr(lesson, 'video_stream_id', None) or getattr(lesson, 'cf_stream_id', None))
        
        if already_completed:
            final_completed = True
        elif has_video:
            # Video lessons must reach at least 90% watch percentage or be completed naturally
            pct = float(watch_percentage or 0.0)
            final_completed = bool(completed or pct >= 90.0)
        else:
            final_completed = bool(completed)

        progress, created = LP.objects.update_or_create(
            student=user,
            lesson=lesson,
            defaults={
                'completed': final_completed,
                'resume_time': resume_time,
                'watch_percentage': watch_percentage,
                'watch_time': watch_time,
            }
        )
        
        if final_completed:
            if not progress.completed_at:
                progress.completed_at = timezone.now()
                progress.save()
            course = getattr(getattr(lesson, 'module', None), 'course', None)
            if course:
                from apps.certificates.utils import check_and_generate_certificate
                check_and_generate_certificate(user, course)
            
        return response.Response({
            "message": "Lesson progress updated successfully",
            "completed": progress.completed,
            "resume_time": progress.resume_time,
            "watch_percentage": progress.watch_percentage
        })

class LessonBookmarkViewSet(viewsets.ModelViewSet):
    serializer_class = LessonBookmarkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from typing import cast
        from rest_framework.request import Request
        
        request = cast(Request, self.request)
        lesson_id = request.query_params.get('lesson')
        qs = LessonBookmark.objects.filter(student=request.user)
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

class LessonNoteViewSet(viewsets.ModelViewSet):
    serializer_class = LessonNoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from typing import cast
        from rest_framework.request import Request
        
        request = cast(Request, self.request)
        lesson_id = request.query_params.get('lesson')
        qs = LessonNote.objects.filter(student=request.user)
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)
