from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.modules.models import Module
from apps.modules.serializers import ModuleSerializer
from apps.core.permissions import IsSuperAdminOrStaff

class ModuleViewSet(viewsets.ModelViewSet):
    serializer_class = ModuleSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsSuperAdminOrStaff()]

    def get_queryset(self):
        from typing import cast
        from rest_framework.request import Request
        
        request = cast(Request, self.request)
        course_id = request.query_params.get('course')
        user = request.user
        from apps.users.models import CustomUser
        if not isinstance(user, CustomUser):
            return Module.objects.none()
            
        if user.role == 'STUDENT':
            # Verify module belongs to a course in the student's categories
            qs = Module.objects.filter(
                course__category__student_profiles__user=user,
                course__is_published=True
            ).distinct()
        elif user.role == 'STAFF':
            category = getattr(user, 'staff_profile', None) and user.staff_profile.category
            if category:
                qs = Module.objects.filter(course__category=category)
            else:
                qs = Module.objects.none()
        else:
            qs = Module.objects.all()

        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs
