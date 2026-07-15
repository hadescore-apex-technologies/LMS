from rest_framework import viewsets, status, decorators, response
from rest_framework.permissions import IsAuthenticated
from apps.users.models import CustomUser, StudentProfile
from apps.students.serializers import StudentSerializer
from apps.core.permissions import IsSuperAdminOrStaff, IsStaff
from apps.core.models import AuditLog
from apps.categories.models import Category

class StudentViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.filter(role='STUDENT').select_related('student_profile')
    serializer_class = StudentSerializer

    def get_queryset(self):
        user = self.request.user
        qs = CustomUser.objects.filter(role='STUDENT').select_related('student_profile')
        if user.role == 'STAFF':
            category = getattr(user, 'staff_profile', None) and user.staff_profile.category
            if category:
                return qs.filter(student_profile__categories=category).distinct()
            return qs.none()
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        target_date_str = request.query_params.get('date')
        from django.utils import timezone
        target_date = timezone.now().date()
        if target_date_str:
            try:
                from datetime import datetime
                target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
            except ValueError:
                pass
                
        from apps.users.models import StudentAttendance
        attendance_map = {
            att.student_id: att.status 
            for att in StudentAttendance.objects.filter(date=target_date)
        }
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            for item in serializer.data:
                item['attendance_status'] = attendance_map.get(item['id'], None)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        for item in data:
            item['attendance_status'] = attendance_map.get(item['id'], None)
        return response.Response(data)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'bulk_import', 'toggle_status', 'reset_password', 'extend_duration', 'change_categories']:
            from apps.core.permissions import IsSuperAdmin
            return [IsSuperAdmin()]
        return [IsSuperAdminOrStaff()]

    def perform_create(self, serializer):
        user = serializer.save()
        # Send welcome email with login credentials
        from apps.core.emails import send_welcome_email
        raw_password = self.request.data.get('password', 'apex123')
        send_welcome_email(
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            password=raw_password,
        )
        AuditLog.objects.create(
            user=self.request.user,
            action=f"Enrolled student: {user.email}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def perform_update(self, serializer):
        user = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            action=f"Updated student account details: {user.email}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def perform_destroy(self, instance):
        email = instance.email
        instance.delete()
        AuditLog.objects.create(
            user=self.request.user,
            action=f"Deleted student account: {email}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    @decorators.action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        student = self.get_object()
        new_password = request.data.get('password')
        if not new_password:
            return response.Response({"error": "Password field is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        student.set_password(new_password)
        student.save()

        AuditLog.objects.create(
            user=request.user,
            action=f"Reset password for student: {student.email}",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return response.Response({"message": "Student password updated successfully"})

    @decorators.action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        student = self.get_object()
        student.is_active = not student.is_active
        student.save()

        action_word = "Activated" if student.is_active else "Deactivated"
        AuditLog.objects.create(
            user=request.user,
            action=f"{action_word} student account: {student.email}",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return response.Response({
            "message": f"Student status changed to {'active' if student.is_active else 'inactive'}",
            "is_active": student.is_active
        })

    @decorators.action(detail=True, methods=['post'], url_path='extend')
    def extend_duration(self, request, pk=None):
        student = self.get_object()
        duration = request.data.get('course_duration')
        
        if not duration or duration not in dict(StudentProfile.DURATION_CHOICES):
            return response.Response({"error": "Valid course_duration choice is required"}, status=status.HTTP_400_BAD_REQUEST)

        profile = student.student_profile
        profile.course_duration = duration
        
        # Calculate new dates
        serializer = self.get_serializer()
        if duration != 'CUSTOM':
            profile.end_date = serializer.calculate_end_date(profile.start_date, duration)
        else:
            custom_end = request.data.get('end_date')
            if not custom_end:
                return response.Response({"error": "end_date is required for CUSTOM duration"}, status=status.HTTP_400_BAD_REQUEST)
            profile.end_date = custom_end

        profile.save()

        AuditLog.objects.create(
            user=request.user,
            action=f"Extended student course duration: {student.email} to {duration} (Ends: {profile.end_date})",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return response.Response({
            "message": "Student course duration extended successfully",
            "course_duration": profile.course_duration,
            "end_date": profile.end_date
        })

    @decorators.action(detail=True, methods=['post'], url_path='change-categories')
    def change_categories(self, request, pk=None):
        student = self.get_object()
        category_ids = request.data.get('categories', [])
        
        profile = student.student_profile
        categories = Category.objects.filter(id__in=category_ids)
        profile.categories.set(categories)
        profile.save()

        AuditLog.objects.create(
            user=request.user,
            action=f"Changed category assignments for student: {student.email}",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return response.Response({
            "message": "Student categories updated successfully",
            "categories": [c.name for c in categories]
        })

    @decorators.action(detail=True, methods=['get'], url_path='progress')
    def get_progress(self, request, pk=None):
        student = self.get_object()
        profile = student.student_profile
        
        from apps.lessons.models import LessonProgress
        from apps.users.models import LoginHistory, StudentAttendance
        from apps.assignments.models import AssignmentSubmission
        
        total_lessons = LessonProgress.objects.filter(student=student, completed=True).count()
        login_logs = LoginHistory.objects.filter(user=student)[:15]
        attendance = StudentAttendance.objects.filter(student=student)[:30]
        submissions = AssignmentSubmission.objects.filter(student=student)
        
        return response.Response({
            "email": student.email,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "course_duration": profile.course_duration,
            "start_date": profile.start_date,
            "end_date": profile.end_date,
            "lessons_completed": total_lessons,
            "logins": [{
                "timestamp": log.timestamp,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent
            } for log in login_logs],
            "attendance": [{
                "date": att.date,
                "status": att.status
            } for att in attendance],
            "assignments": [{
                "id": sub.id,
                "assignment_title": sub.assignment.title,
                "status": sub.status,
                "score": sub.grade,
                "feedback": sub.feedback
            } for sub in submissions]

        })

    @decorators.action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        import csv
        import io
        file_obj = request.FILES.get('file')
        if not file_obj:
            return response.Response({"error": "No file uploaded. Please upload a CSV file."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data_set = file_obj.read().decode('utf-8-sig')
            io_string = io.StringIO(data_set)
            reader = csv.DictReader(io_string)
        except Exception as e:
            return response.Response({"error": f"Failed to parse file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        
        success_count = 0
        errors = []
        
        for idx, row in enumerate(reader):
            email = row.get('email', '').strip()
            first_name = row.get('first_name', '').strip()
            last_name = row.get('last_name', '').strip()
            phone = row.get('phone', '').strip()
            duration = row.get('course_duration', '90').strip()
            
            if not email:
                errors.append(f"Row {idx+1}: Email is required.")
                continue
                
            if CustomUser.objects.filter(email=email).exists():
                errors.append(f"Row {idx+1}: Email '{email}' already exists.")
                continue
            
            try:
                user = CustomUser.objects.create_user(
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role='STUDENT'
                )
                user.set_password('apex123')
                user.save()
                
                profile = StudentProfile.objects.create(
                    user=user,
                    phone=phone,
                    course_duration=duration,
                    assigned_staff=request.user if request.user.role == 'STAFF' else None
                )
                
                from datetime import date
                profile.start_date = date.today()
                profile.end_date = self.get_serializer().calculate_end_date(profile.start_date, duration)
                profile.save()

                # Auto-assign category from mentor
                if profile.assigned_staff and hasattr(profile.assigned_staff, 'staff_profile') and profile.assigned_staff.staff_profile.category:
                    profile.categories.add(profile.assigned_staff.staff_profile.category)
                
                success_count += 1
            except Exception as ex:
                errors.append(f"Row {idx+1}: Error creating student: {str(ex)}")
                
        AuditLog.objects.create(
            user=request.user,
            action=f"Bulk imported {success_count} student accounts",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return response.Response({
            "message": f"Successfully imported {success_count} students.",
            "errors": errors
        }, status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS)

    @decorators.action(detail=False, methods=['get'], url_path='bulk-export')
    def bulk_export(self, request):
        import csv
        from django.http import HttpResponse
        
        response_http = HttpResponse(content_type='text/csv')
        response_http['Content-Disposition'] = 'attachment; filename="students_directory.csv"'
        
        writer = csv.writer(response_http)
        writer.writerow(['email', 'first_name', 'last_name', 'phone', 'course_duration', 'start_date', 'end_date', 'status'])
        
        students = CustomUser.objects.filter(role='STUDENT').select_related('student_profile')
        for s in students:
            profile = getattr(s, 'student_profile', None)
            writer.writerow([
                s.email,
                s.first_name,
                s.last_name,
                profile.phone if profile else '',
                profile.course_duration if profile else '',
                profile.start_date if profile else '',
                profile.end_date if profile else '',
                'Active' if s.is_active else 'Inactive'
            ])
            
        return response_http

    @decorators.action(detail=True, methods=['post'], url_path='log-attendance')
    def log_attendance(self, request, pk=None):
        student = self.get_object()
        date_str = request.data.get('date')
        status_val = request.data.get('status', 'PRESENT')
        
        if status_val not in ['PRESENT', 'ABSENT', 'LATE']:
            return response.Response({"error": "Invalid attendance status"}, status=status.HTTP_400_BAD_REQUEST)
            
        from apps.users.models import StudentAttendance
        from datetime import date
        target_date = date.today()
        if date_str:
            try:
                from datetime import datetime
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return response.Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
                
        attendance, created = StudentAttendance.objects.update_or_create(
            student=student,
            date=target_date,
            defaults={'status': status_val}
        )
        
        return response.Response({
            "message": "Attendance recorded successfully",
            "date": attendance.date,
            "status": attendance.status
        })
