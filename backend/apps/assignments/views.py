from django.utils import timezone
from rest_framework import viewsets, status, decorators, response
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

    def get_queryset(self):
        from typing import cast
        from rest_framework.request import Request
        from apps.users.models import CustomUser
        
        request = cast(Request, self.request)
        user = request.user
        if not isinstance(user, CustomUser):
            return Assignment.objects.none()

        module_id = request.query_params.get('module')
        course_id = request.query_params.get('course')

        if user.role == 'STUDENT':
            qs = Assignment.objects.filter(
                module__course__category__student_profiles__user=user,
                module__course__is_published=True
            ).distinct()
        elif user.role == 'STAFF':
            category = getattr(user, 'staff_profile', None) and user.staff_profile.category
            if category:
                qs = Assignment.objects.filter(module__course__category=category)
            else:
                qs = Assignment.objects.none()
        else:
            qs = Assignment.objects.all()

        if course_id:
            qs = qs.filter(module__course_id=course_id)
        if module_id:
            qs = qs.filter(module_id=module_id)
        return qs

class AssignmentSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSubmissionSerializer

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsSuperAdminOrStaff()]
        return [IsAuthenticated()]

    def get_queryset(self):
        from apps.users.models import CustomUser
        user = self.request.user
        if not isinstance(user, CustomUser):
            return AssignmentSubmission.objects.none()

        qs = AssignmentSubmission.objects.select_related('student', 'assignment', 'graded_by')
        if user.role == 'STUDENT':
            return qs.filter(student=user)
        elif user.role == 'STAFF':
            category = getattr(user, 'staff_profile', None) and user.staff_profile.category
            if category:
                return qs.filter(assignment__module__course__category=category)
            return qs.none()
        return qs


    def perform_create(self, serializer):
        submission = serializer.save()
        from apps.certificates.utils import check_and_generate_certificate
        check_and_generate_certificate(submission.student, submission.assignment.module.course)
        
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
            from apps.certificates.utils import check_and_generate_certificate
            check_and_generate_certificate(submission.student, submission.assignment.module.course)

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
