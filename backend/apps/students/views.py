# pyrefly: ignore [missing-import]
from django.db.models import Q
# pyrefly: ignore [missing-import]
from django.utils import timezone
# pyrefly: ignore [missing-import]
from rest_framework import viewsets, status, decorators, response
from apps.users.models import CustomUser, StudentProfile
from apps.students.serializers import StudentSerializer
from apps.core.permissions import IsSuperAdminOrStaff
from apps.core.models import AuditLog

class StudentViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.filter(role='STUDENT').select_related('student_profile')
    serializer_class = StudentSerializer

    def get_queryset(self):
        user = self.request.user
        # pyrefly: ignore [missing-import]
        from django.db.models import Exists, OuterRef
        from apps.certificates.models import Certificate
        
        qs = CustomUser.objects.filter(role='STUDENT').select_related(
            'student_profile', 
            'student_profile__assigned_staff',
            'student_profile__assigned_live_staff'
        ).prefetch_related(
            'student_profile__courses',
            'student_profile__courses__category'
        ).annotate(
            has_cert=Exists(Certificate.objects.filter(student=OuterRef('pk')))
        )
        
        live_mode = self.request.query_params.get('live_mode') == 'true'
        
        if user.role == 'STAFF':
            # pyrefly: ignore [missing-import]
            from django.db.models import Q
            # Staff members strictly manage ONLY students directly assigned to them (not all domain students)
            return qs.filter(
                Q(student_profile__assigned_live_staff=user) | 
                Q(student_profile__assigned_staff=user)
            ).distinct()
        
        if self.request.query_params.get('live_mode') is not None:
            # pyrefly: ignore [missing-import]
            from django.db.models import Q
            if live_mode:
                qs = qs.filter(
                    Q(student_profile__student_type__in=['LIVE_CLASS', 'BOTH']) |
                    Q(student_profile__assigned_live_staff__isnull=False) |
                    Q(student_profile__courses__is_mentoring_track=True)
                ).distinct()
            else:
                qs = qs.filter(
                    Q(student_profile__student_type__in=['COURSE', 'BOTH']) |
                    Q(student_profile__assigned_staff__isnull=False) |
                    Q(student_profile__courses__is_mentoring_track=False) |
                    Q(student_profile__student_type__isnull=True)
                ).distinct()

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        target_date_str = request.query_params.get('date')
        today = timezone.now().date()
        target_date = today
        if target_date_str:
            try:
                from datetime import datetime
                parsed_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
                if parsed_date <= today:
                    target_date = parsed_date
            except ValueError:
                pass
                
        from apps.users.models import StudentAttendance, CustomUser
        
        # 1. Create missing attendance records ONLY for the students being displayed on this page
        students_to_process = page if page is not None else queryset
        student_ids = [u.id for u in students_to_process]
        
        if student_ids:
            existing_att_ids = set(StudentAttendance.objects.filter(date=target_date, student_id__in=student_ids).values_list('student_id', flat=True))
            missing_ids = set(student_ids) - existing_att_ids
            
            if missing_ids:
                new_absent_records = [
                    StudentAttendance(student_id=s_id, date=target_date, status='ABSENT')
                    for s_id in missing_ids
                ]
                StudentAttendance.objects.bulk_create(new_absent_records, ignore_conflicts=True)

        # 2. Fetch attendance only for the current page's students
        attendance_map = dict(
            StudentAttendance.objects.filter(date=target_date, student_id__in=student_ids)
            .values_list('student_id', 'status')
        )

        from collections import defaultdict
        attendance_logs_map = defaultdict(list)
        # Fetching all historical logs but restricted to the current page's students
        for att in StudentAttendance.objects.filter(student_id__in=student_ids, date__lte=today).order_by('-date'):
            d_str = att.date.strftime("%Y-%m-%d") if hasattr(att.date, "strftime") else str(att.date)
            t_str = att.first_login.strftime("%H:%M:%S") if (att.first_login and hasattr(att.first_login, "strftime")) else (str(att.first_login) if att.first_login else None)
            attendance_logs_map[att.student_id].append({
                "date": d_str,
                "status": att.status,
                "first_login": t_str
            })
        
        serializer = self.get_serializer(students_to_process, many=True)
        data = serializer.data
        for item in data:
            item['attendance_status'] = attendance_map.get(item['id'], None)
            item['attendance_logs'] = attendance_logs_map.get(item['id'], [])
            
        if page is not None:
            return self.get_paginated_response(data)
        return response.Response(data)

    def get_permissions(self):
        if self.action == 'bulk_import':
            from apps.core.permissions import IsSuperAdmin
            return [IsSuperAdmin()]
        return [IsSuperAdminOrStaff()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print(f"\n============================================================")
            print(f"STUDENT CREATION VALIDATION ERROR:")
            print(serializer.errors)
            print(f"============================================================\n")
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            print(f"\n============================================================")
            print(f"STUDENT UPDATE VALIDATION ERROR:")
            print(serializer.errors)
            print(f"============================================================\n")
            return response.Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        # Re-fetch with full select_related + annotation so response matches GET list exactly
        # pyrefly: ignore [missing-import]
        from django.db.models import Exists, OuterRef
        # pyrefly: ignore [missing-import]
        from apps.certificates.models import Certificate
        refreshed = CustomUser.objects.filter(pk=instance.pk).select_related(
            'student_profile',
            'student_profile__assigned_staff',
            'student_profile__assigned_live_staff',
        ).prefetch_related('student_profile__courses').annotate(
            has_cert=Exists(Certificate.objects.filter(student=OuterRef('pk')))
        ).first()
        return response.Response(self.get_serializer(refreshed).data)

    def perform_create(self, serializer):
        # Check if this is a re-activation before saving
        email = self.request.data.get('email', '').strip().lower()
        is_reactivation = CustomUser.objects.filter(email=email).exists()

        user = serializer.save()
        # Send welcome email with login credentials
        # pyrefly: ignore [missing-import]
        from apps.core.emails import send_welcome_email
        # pyrefly: ignore [missing-import]
        from django.conf import settings
        raw_pwd = self.request.data.get('password')
        password_to_send = raw_pwd.strip() if (raw_pwd and isinstance(raw_pwd, str) and raw_pwd.strip()) else 'apex123'
        
        prof = getattr(user, 'student_profile', None)
        stype = getattr(prof, 'student_type', 'COURSE') if prof else 'COURSE'
        req = getattr(self, 'request', None)
        if req and (req.query_params.get('live_mode') == 'true' or (hasattr(req, 'data') and isinstance(req.data, dict) and (req.data.get('live_mode') in (True, 'true') or req.data.get('student_type') == 'LIVE_CLASS'))):
            stype = 'LIVE_CLASS'
            if prof and prof.student_type != 'LIVE_CLASS':
                prof.student_type = 'LIVE_CLASS'
                prof.save()

        role_label = 'LIVE_STUDENT' if stype == 'LIVE_CLASS' else 'STUDENT'
        frontend_base = getattr(settings, 'FRONTEND_URL', 'https://lms.hadescoretech.com')
        login_url = f"{frontend_base}/student/live-login" if stype == 'LIVE_CLASS' else f"{frontend_base}/student/login"

        send_welcome_email(
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            password=password_to_send,
            role=role_label,
            login_url=login_url,
        )
        action = f"Re-enrolled student: {user.email}" if is_reactivation else f"Enrolled student: {user.email}"
        AuditLog.objects.create(
            user=self.request.user,
            action=action,
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

        # Auto-reactivate student account if extended date is valid
        student.is_active = True
        student.save(update_fields=['is_active'])

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
        course_or_cat_ids = request.data.get('categories', []) or request.data.get('courses', [])
        
        profile = student.student_profile
        from apps.courses.models import Course
        courses = Course.objects.filter(Q(id__in=course_or_cat_ids) | Q(category_id__in=course_or_cat_ids))
        profile.courses.set(courses)
        profile.save()

        AuditLog.objects.create(
            user=request.user,
            action=f"Changed course assignments for student: {student.email}",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return response.Response({
            "message": "Student courses updated successfully",
            "courses": [c.title for c in courses]
        })

    @decorators.action(detail=True, methods=['get'], url_path='detail')
    def get_detail(self, request, pk=None):
        return self.get_progress(request, pk=pk)

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
                "status": att.status,
                "first_login": att.first_login.strftime("%H:%M:%S") if (att.first_login and hasattr(att.first_login, "strftime")) else (str(att.first_login) if att.first_login else None)
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
        # pyrefly: ignore [missing-import]
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

    @decorators.action(detail=True, methods=['delete'], url_path='delete-attendance')
    def delete_attendance(self, request, pk=None):
        student = self.get_object()
        date_str = request.query_params.get('date') or request.data.get('date')
        
        if not date_str:
            return response.Response({"error": "Date is required to delete attendance."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            from datetime import datetime
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return response.Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
            
        from apps.users.models import StudentAttendance
        try:
            attendance = StudentAttendance.objects.get(student=student, date=target_date)
            attendance.delete()
            return response.Response({"message": "Attendance record deleted successfully."})
        except StudentAttendance.DoesNotExist:
            return response.Response({"error": "Attendance record not found for the given date."}, status=status.HTTP_404_NOT_FOUND)

