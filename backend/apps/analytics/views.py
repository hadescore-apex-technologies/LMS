from django.utils import timezone
from rest_framework import views, response, status
from rest_framework.permissions import IsAuthenticated
from apps.users.models import CustomUser, StudentProfile
from apps.courses.models import Course, LiveClass
from apps.categories.models import Category
from apps.assignments.models import AssignmentSubmission
from apps.core.models import AuditLog

class DashboardStatsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not isinstance(user, CustomUser):
            return response.Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
            
        today = timezone.now().date()

        if user.role == 'SUPER_ADMIN':
            # Gather Super Admin insights
            total_staff = CustomUser.objects.filter(role='STAFF').count()
            active_staff = CustomUser.objects.filter(role='STAFF', is_active=True).count()
            total_students = CustomUser.objects.filter(role='STUDENT').count()
            total_courses = Course.objects.count()
            
            audit_logs = AuditLog.objects.all()[:10]
            logs_data = [{
                "id": log.id,
                "user": log.user.email if log.user else "System",
                "action": log.action,
                "created_at": log.created_at
            } for log in audit_logs]

            return response.Response({
                "total_staff": total_staff,
                "active_staff": active_staff,
                "total_students": total_students,
                "total_courses": total_courses,
                "recent_activity": logs_data
            })

        elif user.role == 'STAFF':
            # Gather Staff operational insights for their category
            category = getattr(user, 'staff_profile', None) and user.staff_profile.category
            if category:
                total_students = CustomUser.objects.filter(role='STUDENT', student_profile__categories=category).distinct().count()
                active_students = CustomUser.objects.filter(role='STUDENT', is_active=True, student_profile__categories=category).distinct().count()
                expired_students = CustomUser.objects.filter(
                    role='STUDENT', 
                    is_active=False,
                    student_profile__end_date__lte=today,
                    student_profile__categories=category
                ).distinct().count()
                total_categories = 1
                total_courses = Course.objects.filter(category=category).count()
                pending_assignments = AssignmentSubmission.objects.filter(
                    status='PENDING', 
                    assignment__module__course__category=category
                ).count()
                
                # Count live sessions scheduled for today in assigned category
                live_classes_today = LiveClass.objects.filter(
                    scheduled_time__date=today,
                    course__category=category
                ).count()
                
                # Track students expiring in the next 7 days in this category
                seven_days_later = today + timezone.timedelta(days=7)
                upcoming_expiries = StudentProfile.objects.filter(
                    end_date__gte=today,
                    end_date__lte=seven_days_later,
                    user__is_active=True,
                    categories=category
                ).select_related('user').distinct()
                expiries_data = [{
                    "email": p.user.email,
                    "name": f"{p.user.first_name} {p.user.last_name}",
                    "end_date": p.end_date
                } for p in upcoming_expiries]
                
                # Calculate weekly cumulative student growth over the past 5 weeks in this category
                growth_data = []
                today_dt = timezone.now()
                week_offsets = [28, 21, 14, 7, 0]
                for i, offset in enumerate(week_offsets):
                    end_date = today_dt - timezone.timedelta(days=offset)
                    count = CustomUser.objects.filter(
                        role='STUDENT',
                        student_profile__categories=category,
                        date_joined__lte=end_date
                    ).distinct().count()
                    growth_data.append({
                        "week": f"W{i+1}",
                        "count": count
                    })
            else:
                total_students = 0
                active_students = 0
                expired_students = 0
                total_categories = 0
                total_courses = 0
                pending_assignments = 0
                live_classes_today = 0
                expiries_data = []
                growth_data = []
            
            # Retrieve recent activity logs
            recent_logs = AuditLog.objects.all()[:10]
            logs_data = [{
                "id": log.id,
                "user": log.user.email if log.user else "System",
                "action": log.action,
                "created_at": log.created_at
            } for log in recent_logs]

            return response.Response({
                "total_students": total_students,
                "active_students": active_students,
                "expired_students": expired_students,
                "categories_count": total_categories,
                "courses_count": total_courses,
                "pending_assignments": pending_assignments,
                "today_live_classes": live_classes_today,
                "recent_activity": logs_data,
                "upcoming_expiry_students": expiries_data,
                "student_growth": growth_data
            })

        else:
            # Gather Student dashboard progress details (filtering courses by their assigned categories)
            student_categories = Category.objects.filter(student_profiles__user=user)
            assigned_courses = Course.objects.filter(category__in=student_categories, is_published=True)
            
            total_assigned = assigned_courses.count()
            upcoming_live_classes = LiveClass.objects.filter(
                course__in=assigned_courses, 
                status='UPCOMING'
            ).count()
            
            total_submissions = AssignmentSubmission.objects.filter(student=user).count()
            graded_submissions = AssignmentSubmission.objects.filter(student=user, status='GRADED').count()

            from apps.certificates.models import Certificate
            certificates_count = Certificate.objects.filter(student=user, is_issued=True).count()

            # Calculate daily study hours for the past 7 days based on completed lesson durations
            import datetime
            today_date = timezone.now().date()
            study_hours_data = []
            total_hours_sum = 0
            
            days = []
            for i in range(6, -1, -1):
                days.append(today_date - timezone.timedelta(days=i))

            from apps.lessons.models import LessonProgress
            for d in days:
                completed_today = LessonProgress.objects.filter(
                    student=user,
                    completed=True,
                    completed_at__date=d
                ).select_related('lesson')
                
                duration_mins = sum(lp.lesson.estimated_duration for lp in completed_today)
                hours = round(duration_mins / 60.0, 1)
                
                study_hours_data.append({
                    "day": d.strftime('%a'),
                    "hours": hours
                })
                total_hours_sum += hours

            avg_hours = round(total_hours_sum / 7.0, 1)

            return response.Response({
                "assigned_courses_count": total_assigned,
                "upcoming_live_classes": upcoming_live_classes,
                "assignments_submitted": total_submissions,
                "assignments_graded": graded_submissions,
                "certificates_count": certificates_count,
                "study_hours": study_hours_data,
                "avg_hours": avg_hours
            })
