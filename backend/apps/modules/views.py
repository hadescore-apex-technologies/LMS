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

    def create(self, request, *args, **kwargs):
        print("DEBUG MODULE CREATE - Request Data:", request.data)
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("DEBUG MODULE CREATE - Serializer Errors:", serializer.errors)
        return super().create(request, *args, **kwargs)

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
            profile = getattr(user, 'student_profile', None)
            student_courses = list(profile.courses.all()) if profile else []
            staff = profile.assigned_staff if profile else None
            staff_cat = getattr(getattr(staff, 'staff_profile', None), 'category', None)
            
            qs = Module.objects.filter(course__is_published=True)
            if student_courses or staff_cat or staff:
                from django.db.models import Q
                filters = Q()
                if student_courses:
                    filters |= Q(course__in=student_courses)
                if staff_cat:
                    filters |= Q(course__category=staff_cat)
                if staff:
                    filters |= Q(course__mentor=staff)
                qs = qs.filter(filters).distinct()
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
