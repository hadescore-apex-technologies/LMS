from rest_framework import viewsets, status, response, decorators
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from apps.users.models import CustomUser
from apps.users.serializers import StaffUserSerializer
from apps.core.permissions import IsSuperAdmin, IsSuperAdminOrStaff
from apps.core.models import AuditLog

class MentorListView(APIView):
    """Returns list of all STAFF users as mentor options (read-only for staff/admin)."""
    permission_classes = [IsSuperAdminOrStaff]

    def get(self, request):
        mentors = CustomUser.objects.filter(role='STAFF', is_active=True).values('id', 'first_name', 'last_name', 'email')
        data = [
            {
                'id': m['id'],
                'name': f"{m['first_name']} {m['last_name']}".strip() or m['email'],
                'email': m['email']
            }
            for m in mentors
        ]
        return response.Response(data)


class StaffViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.filter(role__in=['STAFF', 'SUPER_ADMIN'])
    serializer_class = StaffUserSerializer
    permission_classes = [IsSuperAdmin]

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
            action=f"Created Staff user account: {user.email}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def perform_update(self, serializer):
        user = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            action=f"Updated Staff user account: {user.email}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def perform_destroy(self, instance):
        if instance.email == 'hadescore.apex.technologies@gmail.com':
            from rest_framework.exceptions import ValidationError
            raise ValidationError("The root administrator account cannot be deleted.")
        email = instance.email
        instance.delete()
        AuditLog.objects.create(
            user=self.request.user,
            action=f"Deleted Staff user account: {email}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    @decorators.action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        staff_user = self.get_object()
        new_password = request.data.get('password')
        if not new_password:
            return response.Response(
                {"error": "password field is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        staff_user.set_password(new_password)
        staff_user.save()
        
        # Log this event
        AuditLog.objects.create(
            user=request.user,
            action=f"Reset password for Staff user: {staff_user.email}",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return response.Response({"message": "Password reset successfully"})

class UserProfileViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        profile_data = {
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
        }
        attendance_marked = False
        if user.role == 'STUDENT':
            from apps.users.models import StudentAttendance
            from django.utils import timezone
            
            today = timezone.now().date()
            attendance, created = StudentAttendance.objects.get_or_create(
                student=user,
                date=today,
                defaults={'status': 'PRESENT'}
            )
            if created:
                attendance_marked = True

        if user.role == 'STUDENT' and hasattr(user, 'student_profile'):
            profile = user.student_profile
            profile_data.update({
                "phone": profile.phone,
                "profile_photo": profile.profile_photo,
                "course_duration": profile.course_duration,
                "start_date": profile.start_date,
                "end_date": profile.end_date,
                "notes": profile.notes,
                "categories": [c.name for c in profile.categories.all()],
                "attendance_marked": attendance_marked
            })
        elif user.role == 'STAFF' and hasattr(user, 'staff_profile'):
            profile = user.staff_profile
            profile_data.update({
                "category": profile.category.id if profile.category else None,
                "category_name": profile.category.name if profile.category else None,
            })
        return response.Response(profile_data)

    def create(self, request):
        user = request.user
        user.first_name = request.data.get('first_name', user.first_name)
        user.last_name = request.data.get('last_name', user.last_name)
        user.save()

        if user.role == 'STUDENT' and hasattr(user, 'student_profile'):
            profile = user.student_profile
            profile.phone = request.data.get('phone', profile.phone)
            profile.profile_photo = request.data.get('profile_photo', profile.profile_photo)
            profile.save()

        return response.Response({"message": "Profile updated successfully"})

    @decorators.action(detail=False, methods=['get'], url_path='attendance')
    def attendance(self, request):
        from apps.users.models import StudentAttendance
        user = request.user
        records = StudentAttendance.objects.filter(student=user).order_by('date')
        
        present_count = records.filter(status='PRESENT').count()
        absent_count = records.filter(status='ABSENT').count()
        late_count = records.filter(status='LATE').count()
        total_days = records.count()
        
        attended_count = present_count + late_count
        attendance_percentage = round((attended_count / total_days) * 100, 2) if total_days > 0 else 100.0

        records_data = [{
            "id": r.id,
            "date": r.date.strftime("%Y-%m-%d") if hasattr(r.date, "strftime") else str(r.date),
            "status": r.status
        } for r in records]

        return response.Response({
            "present_count": present_count,
            "absent_count": absent_count,
            "late_count": late_count,
            "total_days": total_days,
            "attendance_percentage": attendance_percentage,
            "records": records_data
        })

    @decorators.action(detail=False, methods=['get'], url_path='login-history')
    def login_history(self, request):
        from apps.users.models import LoginHistory
        user = request.user
        records = LoginHistory.objects.filter(user=user).order_by('-timestamp')[:20]
        records_data = [{
            "id": r.id,
            "timestamp": r.timestamp,
            "ip_address": r.ip_address,
            "user_agent": r.user_agent
        } for r in records]
        return response.Response(records_data)

    @decorators.action(detail=False, methods=['get'], url_path='leaderboard')
    def leaderboard(self, request):
        from apps.users.models import StudentProfile
        from apps.lessons.models import LessonProgress
        from apps.quizzes.models import QuizAttempt
        from apps.assignments.models import AssignmentSubmission
        
        profiles = StudentProfile.objects.select_related('user').all()
        board = []
        for profile in profiles:
            email = profile.user.email
            name = f"{profile.user.first_name} {profile.user.last_name}".strip() or email
            
            lessons_count = LessonProgress.objects.filter(student=profile.user, completed=True).count()
            quizzes_count = QuizAttempt.objects.filter(student=profile.user, passed=True).values('quiz').distinct().count()
            assignments_count = AssignmentSubmission.objects.filter(student=profile.user).values('assignment').distinct().count()
            
            # Score logic: lessons = 10, quizzes = 50, assignments = 100 points
            score = (lessons_count * 10) + (quizzes_count * 50) + (assignments_count * 100)
            
            board.append({
                "email": email,
                "name": name,
                "lessons_completed": lessons_count,
                "quizzes_passed": quizzes_count,
                "assignments_submitted": assignments_count,
                "score": score
            })
            
        board = sorted(board, key=lambda x: x['score'], reverse=True)
        return response.Response(board)

    @decorators.action(detail=False, methods=['get'], url_path='achievements')
    def achievements(self, request):
        from apps.users.models import LoginHistory
        from apps.lessons.models import LessonProgress
        from apps.quizzes.models import QuizAttempt
        from apps.assignments.models import AssignmentSubmission
        from django.utils import timezone
        import datetime
        
        user = request.user
        
        # Streak calculation based on LoginHistory
        login_dates = LoginHistory.objects.filter(user=user).values_list('timestamp', flat=True)
        unique_dates = sorted(list({t.date() for t in login_dates}), reverse=True)
        
        streak = 0
        today = timezone.now().date()
        yesterday = today - datetime.timedelta(days=1)
        
        if unique_dates and (unique_dates[0] == today or unique_dates[0] == yesterday):
            streak = 1
            for i in range(len(unique_dates) - 1):
                if unique_dates[i] - unique_dates[i+1] == datetime.timedelta(days=1):
                    streak += 1
                else:
                    break
                    
        lessons_count = LessonProgress.objects.filter(student=user, completed=True).count()
        quizzes_count = QuizAttempt.objects.filter(student=user, passed=True).values('quiz').distinct().count()
        assignments_count = AssignmentSubmission.objects.filter(student=user).values('assignment').distinct().count()
        
        badges = [
            {
                "id": "quick_starter",
                "title": "Quick Starter",
                "description": "Submitted your first assignment",
                "unlocked": assignments_count >= 1,
                "unlocked_at": timezone.now() if assignments_count >= 1 else None
            },
            {
                "id": "quiz_master",
                "title": "Quiz Master",
                "description": "Passed any course checkpoint quiz",
                "unlocked": quizzes_count >= 1,
                "unlocked_at": timezone.now() if quizzes_count >= 1 else None
            },
            {
                "id": "persistent_scholar",
                "title": "Persistent Scholar",
                "description": "Achieved a 3-day login streak",
                "unlocked": streak >= 3,
                "unlocked_at": timezone.now() if streak >= 3 else None
            },
            {
                "id": "perfect_attender",
                "title": "Perfect Scholar",
                "description": "Completed at least 5 lesson videos",
                "unlocked": lessons_count >= 5,
                "unlocked_at": timezone.now() if lessons_count >= 5 else None
            }
        ]
        
        return response.Response({
            "streak": streak,
            "lessons_completed": lessons_count,
            "quizzes_passed": quizzes_count,
            "assignments_submitted": assignments_count,
            "badges": badges
        })
