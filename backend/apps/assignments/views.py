# pyrefly: ignore [missing-import]
from django.utils import timezone
# pyrefly: ignore [missing-import]
from django.db.models import Q
# pyrefly: ignore [missing-import]
from rest_framework import viewsets, status, decorators, response
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated
from apps.assignments.models import Assignment, AssignmentSubmission
from apps.assignments.serializers import AssignmentSerializer, AssignmentSubmissionSerializer
from apps.core.permissions import IsSuperAdminOrStaff, IsStudent
from apps.core.models import AuditLog

class AssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsSuperAdminOrStaff()]

    def perform_create(self, serializer):
        user = self.request.user
        assignment = serializer.save(created_by=user)
        AuditLog.objects.create(
            user=user,
            action=f"Created Assignment: '{assignment.title}'",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def get_queryset(self):
        from typing import cast
        # pyrefly: ignore [missing-import]
        from rest_framework.request import Request
        from apps.users.models import CustomUser
        
        request = cast(Request, self.request)
        user = request.user
        if not isinstance(user, CustomUser):
            return Assignment.objects.none()

        module_id = request.query_params.get('module')
        course_id = request.query_params.get('course')

        if user.role == 'STUDENT':
            profile = getattr(user, 'student_profile', None)
            staff = (profile.assigned_staff or profile.assigned_live_staff) if profile else None
            student_courses = list(profile.courses.all()) if profile else []
            
            # Target assignments: either student is explicitly selected, or assignment is open to all students of that mentor/course
            qs = Assignment.objects.filter(
                Q(students=user) | 
                (Q(students__isnull=True) & (
                    Q(created_by=staff) | 
                    Q(course__in=student_courses) | 
                    Q(module__course__in=student_courses)
                ))
            ).distinct()
        elif user.role == 'STAFF':
            category = getattr(user, 'staff_profile', None) and user.staff_profile.category
            filters = (
                Q(created_by=user) | 
                Q(students__student_profile__assigned_live_staff=user) |
                Q(students__student_profile__assigned_staff=user) |
                Q(course__mentor=user) |
                Q(module__course__mentor=user)
            )
            if category:
                filters |= Q(course__category=category) | Q(module__course__category=category)
            qs = Assignment.objects.filter(filters).distinct()
        else:
            qs = Assignment.objects.all()

        if course_id:
            qs = qs.filter(Q(module__course_id=course_id) | Q(course_id=course_id)).distinct()
        if module_id:
            qs = qs.filter(module_id=module_id)

        live_mode = request.query_params.get('live_mode')
        if live_mode is not None:
            is_live = str(live_mode).lower() in ['true', '1', 'yes']
            if is_live:
                qs = qs.filter(
                    Q(course__is_mentoring_track=True) |
                    Q(students__student_profile__student_type__in=['LIVE_CLASS', 'BOTH'])
                ).distinct()
            else:
                qs = qs.filter(
                    Q(course__isnull=True) | Q(course__is_mentoring_track=False)
                ).distinct()

        return qs.select_related('created_by', 'module', 'course').prefetch_related('students')

class AssignmentSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSubmissionSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'grade', 'delete_student']:
            return [IsSuperAdminOrStaff()]
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        from apps.users.models import CustomUser
        user = request.user
        if isinstance(user, CustomUser) and user.role == 'STUDENT':
            if instance.status == 'GRADED':
                return response.Response(
                    {"error": "You cannot delete a submission that has already been graded."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        from apps.users.models import CustomUser
        user = self.request.user
        if not isinstance(user, CustomUser):
            return AssignmentSubmission.objects.none()

        qs = AssignmentSubmission.objects.select_related(
            'student',
            'student__student_profile',
            'student__student_profile__assigned_staff',
            'student__student_profile__assigned_live_staff',
            'assignment',
            'assignment__created_by',
            'assignment__course',
            'assignment__module',
            'graded_by'
        ).prefetch_related('student__student_profile__courses__category')

        live_mode = self.request.query_params.get('live_mode')
        if live_mode is not None:
            is_live = str(live_mode).lower() in ['true', '1', 'yes']
            if is_live:
                qs = qs.filter(student__student_profile__student_type__in=['LIVE_CLASS', 'BOTH'])
            else:
                qs = qs.filter(student__student_profile__student_type__in=['COURSE', 'BOTH'])

        if user.role == 'STUDENT':
            return qs.filter(student=user)

        elif user.role == 'STAFF':
            # Filter by directly assigned students only
            # pyrefly: ignore [missing-import]
            from django.db.models import Q
            return qs.filter(
                Q(student__student_profile__assigned_staff=user) |
                Q(student__student_profile__assigned_live_staff=user)
            ).distinct()

        # SUPER_ADMIN sees all — optionally filter by student email
        student_email = self.request.query_params.get('student_email', '').strip()
        if student_email:
            qs = qs.filter(student__email__icontains=student_email)
        return qs


    def perform_create(self, serializer):
        submission = serializer.save()
        course = submission.assignment.course
        if not course and submission.assignment.module:
            course = submission.assignment.module.course
            
        if course:
            from apps.certificates.utils import check_and_generate_certificate
            check_and_generate_certificate(submission.student, course)
        
        # Log this submission event
        AuditLog.objects.create(
            user=submission.student,
            action=f"Submitted assignment {submission.assignment.title}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    @decorators.action(detail=True, methods=['post'], url_path='grade')
    def grade(self, request, pk=None):
        from apps.users.models import CustomUser
        user = request.user
        if not isinstance(user, CustomUser) or user.role not in ['SUPER_ADMIN', 'STAFF']:
            return response.Response(
                {"error": "Only staff members and admins can grade assignments"},
                status=status.HTTP_403_FORBIDDEN
            )

        submission = self.get_object()
        grade = request.data.get('grade')
        feedback = request.data.get('feedback', '')
        action_type = request.data.get('action', 'grade')  # grade or reject

        if not grade and action_type == 'grade':
            return response.Response(
                {"error": "Grade field is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if action_type == 'reject':
            submission.status = 'REJECTED'
            submission.grade = None
        else:
            submission.status = 'GRADED'
            submission.grade = grade

        submission.feedback = feedback
        submission.graded_by = user
        submission.graded_at = timezone.now()
        submission.save()

        # Try to auto-generate certificate if GRADED
        if submission.status == 'GRADED':
            course = submission.assignment.course
            if not course and submission.assignment.module:
                course = submission.assignment.module.course
            if course:
                from apps.certificates.utils import check_and_generate_certificate
                check_and_generate_certificate(submission.student, course)

        # Log this grading event
        AuditLog.objects.create(
            user=user,
            action=f"Graded submission for student {submission.student.email} (Assignment: {submission.assignment.title}, Grade: {grade})",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return response.Response({
            "message": "Assignment graded successfully",
            "status": submission.status,
            "grade": submission.grade
        })

    @decorators.action(detail=False, methods=['delete'], url_path='delete_student')
    def delete_student(self, request):
        email = request.query_params.get('email')
        if not email:
            return response.Response({"error": "Email parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        from apps.users.models import CustomUser
        user = request.user
        if not isinstance(user, CustomUser) or user.role not in ['SUPER_ADMIN', 'STAFF']:
            return response.Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        submissions = AssignmentSubmission.objects.filter(student__email=email)
        
        if user.role == 'STAFF':
            # Only delete submissions for students directly assigned to this staff
            # pyrefly: ignore [missing-import]
            from django.db.models import Q
            submissions = submissions.filter(
                Q(student__student_profile__assigned_staff=user) |
                Q(student__student_profile__assigned_live_staff=user)
            )
                
        count = submissions.count()
        submissions.delete()
        
        AuditLog.objects.create(
            user=user,
            action=f"Deleted all {count} submissions for student {email}",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return response.Response({"message": f"Successfully deleted {count} submissions for {email}."}, status=status.HTTP_200_OK)
