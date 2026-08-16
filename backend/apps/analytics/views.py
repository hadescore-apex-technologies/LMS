# pyrefly: ignore [missing-import]
from django.utils import timezone
# pyrefly: ignore [missing-import]
from django.db.models import Count, Q, Avg
# pyrefly: ignore [missing-import]
from rest_framework import views, response, status
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated
from apps.users.models import CustomUser, StudentProfile
from apps.courses.models import Course, LiveClass
from apps.categories.models import Category
from apps.assignments.models import Assignment, AssignmentSubmission
from apps.quizzes.models import Quiz, QuizAttempt
from apps.lessons.models import Lesson
from apps.videos.models import Video
from apps.core.models import AuditLog
from apps.core.permissions import IsSuperAdmin
from apps.notifications.models import Notification

class DashboardStatsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not isinstance(user, CustomUser):
            return response.Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
            
        today = timezone.now().date()

        if user.role == 'SUPER_ADMIN':
            live_mode = request.query_params.get('live_mode') == 'true'
            
            # Base filters for students based on live_mode
            if live_mode:
                student_filter = Q(role='STUDENT', student_profile__student_type__in=['LIVE_CLASS', 'BOTH'])
            else:
                student_filter = Q(role='STUDENT', student_profile__student_type__in=['COURSE', 'BOTH'])

            # Fast aggregated query for all user role stats
            # Fast aggregated query for all user role stats
            user_stats = CustomUser.objects.aggregate(
                total_staff=Count('id', filter=Q(role='STAFF')),
                active_staff=Count('id', filter=Q(role='STAFF', is_active=True)),
                total_students=Count('id', filter=student_filter),
                active_students=Count('id', filter=student_filter & Q(is_active=True)),
                expired_students=Count('id', filter=student_filter & Q(is_active=False))
            )

            if live_mode:
                total_courses = Course.objects.filter(is_mentoring_track=True).count()
                total_categories = Category.objects.filter(category_type='LIVE').count()
                total_quizzes = Quiz.objects.filter(module__course__is_mentoring_track=True).count()
                total_assignments = Assignment.objects.filter(module__course__is_mentoring_track=True).count()
                total_lessons = Lesson.objects.filter(module__course__is_mentoring_track=True).count()
                total_videos = Video.objects.filter(lesson__module__course__is_mentoring_track=True).count()
                # All Live Mentoring sessions (created by STAFF or attached to mentoring tracks)
                live_classes_base_qs = LiveClass.objects.filter(
                    Q(created_by__role='STAFF') | Q(course__is_mentoring_track=True)
                ).distinct()
            else:
                total_courses = Course.objects.filter(is_mentoring_track=False).count()
                total_categories = Category.objects.filter(category_type='COURSE').count()
                total_quizzes = Quiz.objects.filter(module__course__is_mentoring_track=False).count()
                total_assignments = Assignment.objects.filter(module__course__is_mentoring_track=False).count()
                total_lessons = Lesson.objects.filter(module__course__is_mentoring_track=False).count()
                total_videos = Video.objects.filter(lesson__module__course__is_mentoring_track=False).count()
                # Course Doubt Clearing sessions ONLY (created by SUPER_ADMIN or course tracks)
                live_classes_base_qs = LiveClass.objects.filter(
                    Q(created_by__role='SUPER_ADMIN') | Q(course__is_mentoring_track=False)
                ).exclude(created_by__role='STAFF').distinct()

            from apps.certificates.models import Certificate
            certificates_issued = Certificate.objects.filter(is_issued=True).count()

            live_classes_today = live_classes_base_qs.filter(
                Q(scheduled_time__date=today) | Q(status__in=['UPCOMING', 'LIVE'])
            ).count()
            total_live_classes = live_classes_base_qs.count()
            pending_assignments = AssignmentSubmission.objects.filter(
                status='PENDING',
                assignment__module__course__is_mentoring_track=live_mode
            ).count()

            seven_days_later = today + timezone.timedelta(days=7)
            expiring_soon = StudentProfile.objects.filter(
                end_date__gte=today,
                end_date__lte=seven_days_later,
                user__is_active=True
            ).count()

            audit_logs = AuditLog.objects.select_related('user').all().order_by('-created_at')[:20]
            logs_data = [{
                "id": log.id,
                "user": log.user.email if log.user else "System",
                "action": log.action,
                "ip_address": log.ip_address,
                "created_at": log.created_at
            } for log in audit_logs]

            trend_data = []
            upcoming_data = []
            activity_trend_data = []
            
            if live_mode:
                from apps.users.models import StudentAttendance
                for i in range(6, -1, -1):
                    d = today - timezone.timedelta(days=i)
                    count = StudentAttendance.objects.filter(
                        date=d,
                        status='PRESENT',
                        student__student_profile__student_type__in=['LIVE_CLASS', 'BOTH']
                    ).count()
                    trend_data.append({
                        "date": d.strftime('%a'),
                        "count": count
                    })
                
                upcoming_sessions = live_classes_base_qs.filter(
                    status='UPCOMING'
                ).order_by('scheduled_time')[:4]
                upcoming_data = [{
                    "id": lc.id,
                    "title": lc.title,
                    "scheduled_time": lc.scheduled_time,
                    "meeting_url": lc.meeting_url
                } for lc in upcoming_sessions]
            else:
                for i in range(6, -1, -1):
                    d = today - timezone.timedelta(days=i)
                    count = AuditLog.objects.filter(created_at__date=d).count()
                    activity_trend_data.append({
                        "date": d.strftime('%a'),
                        "count": count
                    })

            return response.Response({
                "total_staff": user_stats['total_staff'] or 0,
                "active_staff": user_stats['active_staff'] or 0,
                "total_students": user_stats['total_students'] or 0,
                "active_students": user_stats['active_students'] or 0,
                "expired_students": user_stats['expired_students'] or 0,
                "total_courses": total_courses,
                "total_categories": total_categories,
                "total_lessons": total_lessons,
                "total_videos": total_videos,
                "total_quizzes": total_quizzes,
                "total_assignments": total_assignments,
                "certificates_issued": certificates_issued,
                "live_classes_today": live_classes_today,
                "pending_assignments": pending_assignments,
                "expiring_soon": expiring_soon,
                "recent_activity": logs_data,
                "platform_activity_trend": activity_trend_data,
                "live_classes_trend": trend_data,
                "upcoming_sessions": upcoming_data,
                "total_live_classes": total_live_classes
            })

        elif user.role == 'STAFF':
            # Gather Staff operational insights for assigned students (strict 1-to-1 routing)
            category = getattr(user, 'staff_profile', None) and user.staff_profile.category
            
            live_mode = request.query_params.get('live_mode') == 'true'
            
            if live_mode:
                staff_student_qs = CustomUser.objects.filter(role='STUDENT', student_profile__assigned_live_staff=user).distinct()
            else:
                staff_student_qs = CustomUser.objects.filter(role='STUDENT', student_profile__assigned_staff=user).distinct()

            student_stats = staff_student_qs.aggregate(
                total=Count('id'),
                active=Count('id', filter=Q(is_active=True)),
                expired=Count('id', filter=Q(is_active=False, student_profile__end_date__lte=today))
            )
            
            total_students = student_stats['total'] if student_stats['total'] is not None else CustomUser.objects.filter(role='STUDENT').count()
            active_students = student_stats['active'] if student_stats['active'] is not None else CustomUser.objects.filter(role='STUDENT', is_active=True).count()
            expired_students = student_stats['expired'] if student_stats['expired'] is not None else 0

            if live_mode:
                base_course_qs = Course.objects.filter(is_mentoring_track=True)
                base_cat_qs = Category.objects.filter(category_type='LIVE')
            else:
                base_course_qs = Course.objects.filter(is_mentoring_track=False)
                base_cat_qs = Category.objects.filter(category_type='COURSE')

            total_categories = 1 if category else base_cat_qs.count()
            total_courses = base_course_qs.filter(category=category).count() if category else base_course_qs.count()
            
            total_lessons = Lesson.objects.filter(module__course__in=base_course_qs, module__course__category=category).count() if category else Lesson.objects.filter(module__course__in=base_course_qs).count()
            total_videos = Video.objects.filter(lesson__module__course__in=base_course_qs, lesson__module__course__category=category).count() if category else Video.objects.filter(lesson__module__course__in=base_course_qs).count()
            total_quizzes = Quiz.objects.filter(module__course__in=base_course_qs, module__course__category=category).count() if category else Quiz.objects.filter(module__course__in=base_course_qs).count()
            total_assignments = Assignment.objects.filter(module__course__in=base_course_qs, module__course__category=category).count() if category else Assignment.objects.filter(module__course__in=base_course_qs).count()
            
            if category:
                pending_assignments = AssignmentSubmission.objects.filter(
                    status='PENDING',
                    assignment__module__course__category=category,
                    assignment__module__course__is_mentoring_track=live_mode
                ).count()
            else:
                pending_assignments = AssignmentSubmission.objects.filter(
                    status='PENDING',
                    assignment__module__course__is_mentoring_track=live_mode
                ).count()
            
            live_classes_query = LiveClass.objects.filter(
                Q(scheduled_time__date=today) | Q(status__in=['UPCOMING', 'LIVE'])
            )
            if category:
                live_classes_query = live_classes_query.filter(
                    Q(course__category=category) | Q(course__mentor=user) | Q(created_by=user)
                ).distinct()
            live_classes_today = live_classes_query.count()
            
            seven_days_later = today + timezone.timedelta(days=7)
            upcoming_expiries = StudentProfile.objects.filter(
                end_date__gte=today,
                end_date__lte=seven_days_later,
                user__is_active=True
            ).select_related('user').distinct()
            expiries_data = [{
                "email": p.user.email,
                "name": f"{p.user.first_name} {p.user.last_name}",
                "end_date": p.end_date
            } for p in upcoming_expiries]
            
            # Weekly growth data — past 5 weeks (oldest → newest)
            student_joined_dates = list(CustomUser.objects.filter(role='STUDENT').values_list('date_joined', flat=True))

            growth_data = []
            today_date = timezone.now().date()
            for i in range(4, -1, -1):
                week_end = today_date - timezone.timedelta(weeks=i)
                week_start = week_end - timezone.timedelta(days=6)
                count = sum(
                    1 for dt in student_joined_dates
                    if dt and week_start <= dt.date() <= week_end
                )
                week_num = 5 - i
                growth_data.append({
                    "week": f"Week {week_num}",
                    "count": count
                })
            
            recent_logs = AuditLog.objects.select_related('user').all()[:10]
            logs_data = [{
                "id": log.id,
                "user": log.user.email if log.user else "System",
                "action": log.action,
                "created_at": log.created_at
            } for log in recent_logs]

            if category:
                total_live_classes = LiveClass.objects.filter(
                    Q(course__category=category) | Q(course__mentor=user) | Q(created_by=user)
                ).distinct().count()
            else:
                total_live_classes = LiveClass.objects.filter(
                    Q(course__mentor=user) | Q(created_by=user)
                ).distinct().count()

            return response.Response({
                "total_students": total_students,
                "active_students": active_students,
                "expired_students": expired_students,
                "categories_count": total_categories,
                "total_categories": total_categories,
                "courses_count": total_courses,
                "total_courses": total_courses,
                "total_lessons": total_lessons,
                "total_videos": total_videos,
                "total_quizzes": total_quizzes,
                "total_assignments": total_assignments,
                "pending_assignments": pending_assignments,
                "today_live_classes": live_classes_today,
                "total_live_classes": total_live_classes,
                "recent_activity": logs_data,
                "upcoming_expiry_students": expiries_data,
                "student_growth": growth_data
            })

        else:
            # Gather Student dashboard progress details
            
            from apps.users.models import StudentAttendance
            # Fast check to avoid expensive daily DB writes on every API call
            if not StudentAttendance.objects.filter(student=user, date=today).exists():
                StudentAttendance.objects.create(
                    student=user,
                    date=today,
                    status='PRESENT'
                )

            live_mode = request.query_params.get('live_mode') == 'true'
            student_profile = getattr(user, 'student_profile', None)
            student_courses = list(student_profile.courses.all()) if student_profile else []
            staff = (student_profile.assigned_live_staff if live_mode else student_profile.assigned_staff) if student_profile else None
            staff_cat = getattr(getattr(staff, 'staff_profile', None), 'category', None)
            
            assigned_courses = Course.objects.filter(is_published=True, is_mentoring_track=live_mode)
            if student_courses or staff_cat or staff:
                filters = Q()
                if student_courses:
                    filters |= Q(id__in=[c.id for c in student_courses])
                if staff_cat:
                    filters |= Q(category=staff_cat)
                if staff:
                    filters |= Q(mentor=staff)
                assigned_courses = assigned_courses.filter(filters).distinct()
            else:
                assigned_courses = Course.objects.none()
            
            total_assigned = assigned_courses.count()

            if live_mode:
                # Live Mentoring Mode: only sessions created in Live Class Mentoring (course__isnull=True)
                upcoming_live_classes = LiveClass.objects.filter(
                    Q(students=user) | (Q(created_by=staff) if staff else Q(students=user)),
                    course__isnull=True,
                    status='UPCOMING'
                ).distinct().count()
            else:
                # Course Doubt Session Mode: only sessions for assigned courses (course__isnull=False)
                upcoming_live_classes = LiveClass.objects.filter(
                    course__in=assigned_courses,
                    course__isnull=False,
                    status='UPCOMING'
                ).distinct().count()
            
            sub_qs = AssignmentSubmission.objects.filter(student=user)
            if live_mode:
                sub_qs = sub_qs.filter(
                    Q(assignment__course__is_mentoring_track=True) |
                    Q(assignment__module__course__is_mentoring_track=True)
                )
            else:
                sub_qs = sub_qs.filter(
                    Q(assignment__course__is_mentoring_track=False) |
                    Q(assignment__module__course__is_mentoring_track=False)
                )
            sub_stats = sub_qs.aggregate(
                total=Count('id'),
                graded=Count('id', filter=Q(status='GRADED'))
            )
            total_submissions = sub_stats['total'] or 0
            graded_submissions = sub_stats['graded'] or 0

            from apps.certificates.models import Certificate
            certificates_count = Certificate.objects.filter(student=user, is_issued=True).count()

            today_date = timezone.now().date()
            study_hours_data = []
            total_hours_sum = 0
            seven_days_ago = today_date - timezone.timedelta(days=6)
            
            # 1. Lesson watch duration & completion minutes
            from apps.lessons.models import LessonProgress
            # Performance Optimization: Avoid loading large markdown content column for all lessons
            progress_records = LessonProgress.objects.filter(
                student=user
            ).select_related('lesson').only(
                'completed_at', 'completed', 'resume_time',
                'lesson__id', 'lesson__estimated_duration'
            )

            if live_mode:
                progress_records = progress_records.filter(lesson__module__course__is_mentoring_track=True)
            else:
                progress_records = progress_records.filter(lesson__module__course__is_mentoring_track=False)

            duration_by_date = {}
            for lp in progress_records:
                d_key = lp.completed_at.date() if lp.completed_at else (lp.updated_at.date() if hasattr(lp, 'updated_at') and lp.updated_at else today_date)
                watch_mins = int((lp.resume_time or 0) // 60)
                lesson_est = (lp.lesson.estimated_duration if lp.lesson and lp.lesson.estimated_duration else 15) if lp.completed else 0
                dur = max(watch_mins, lesson_est)
                if dur > 0:
                    duration_by_date[d_key] = duration_by_date.get(d_key, 0) + dur

            # 2. Attendance & Live Session (at least 30 minutes logged on any present attendance date in 7-day window)
            from apps.users.models import StudentAttendance
            attendance_records = StudentAttendance.objects.filter(
                student=user,
                date__gte=seven_days_ago,
                status='PRESENT'
            )
            for att in attendance_records:
                duration_by_date[att.date] = max(duration_by_date.get(att.date, 0), 30)

            # 3. Exercises: Submissions & Quiz attempts (20 mins per assignment, 15 mins per quiz)
            submissions = AssignmentSubmission.objects.filter(
                student=user,
                submitted_at__date__gte=seven_days_ago
            )
            for sub in submissions:
                if sub.submitted_at:
                    s_date = sub.submitted_at.date()
                    duration_by_date[s_date] = duration_by_date.get(s_date, 0) + 20

            attempts = QuizAttempt.objects.filter(
                student=user,
                completed_at__date__gte=seven_days_ago
            )
            for att in attempts:
                if att.completed_at:
                    a_date = att.completed_at.date()
                    duration_by_date[a_date] = duration_by_date.get(a_date, 0) + 15

            for i in range(6, -1, -1):
                d = today_date - timezone.timedelta(days=i)
                duration_mins = duration_by_date.get(d, 0)
                hours = round(duration_mins / 60.0, 1)
                study_hours_data.append({
                    "day": d.strftime('%a'),
                    "hours": hours,
                    "minutes": duration_mins
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


class MentorAssignmentsView(views.APIView):
    """Returns mentor-student assignment mapping for admin overview."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        live_mode = request.query_params.get('live_mode') == 'true'

        staff_users = CustomUser.objects.filter(
            role='STAFF', is_active=True
        ).select_related('staff_profile', 'staff_profile__category').order_by('first_name', 'last_name')

        mentors_data = []
        for staff in staff_users:
            if live_mode:
                assigned_students = StudentProfile.objects.filter(assigned_live_staff=staff).select_related('user').order_by('user__first_name')
            else:
                assigned_students = StudentProfile.objects.filter(assigned_staff=staff).select_related('user').order_by('user__first_name')

            students_list = []
            for sp in assigned_students:
                assignment_type = []
                if sp.assigned_staff_id == staff.id:
                    assignment_type.append('COURSE')
                if sp.assigned_live_staff_id == staff.id:
                    assignment_type.append('LIVE_CLASS')
                    
                students_list.append({
                    'id': sp.user.id,
                    'email': sp.user.email,
                    'first_name': sp.user.first_name,
                    'last_name': sp.user.last_name,
                    'is_active': sp.user.is_active,
                    'start_date': sp.start_date,
                    'end_date': sp.end_date,
                    'categories': list(sp.courses.values_list('title', flat=True)),
                    'student_type': sp.student_type,
                    'assignment_types': assignment_type
                })

            category_name = None
            if hasattr(staff, 'staff_profile') and staff.staff_profile and staff.staff_profile.category:
                category_name = staff.staff_profile.category.name

            mentors_data.append({
                'id': staff.id,
                'email': staff.email,
                'first_name': staff.first_name,
                'last_name': staff.last_name,
                'category': category_name,
                'student_count': len(students_list),
                'students': students_list,
            })

        if live_mode:
            unassigned_profiles = StudentProfile.objects.filter(
                Q(student_type='LIVE_CLASS') | Q(student_type='BOTH'),
                assigned_live_staff__isnull=True
            ).select_related('user').order_by('user__first_name')
            total_students_count = StudentProfile.objects.filter(
                Q(student_type='LIVE_CLASS') | Q(student_type='BOTH')
            ).count()
        else:
            unassigned_profiles = StudentProfile.objects.filter(
                Q(student_type='COURSE') | Q(student_type='BOTH'),
                assigned_staff__isnull=True
            ).select_related('user').order_by('user__first_name')
            total_students_count = StudentProfile.objects.filter(
                Q(student_type='COURSE') | Q(student_type='BOTH')
            ).count()

        unassigned_students = []
        for sp in unassigned_profiles:
            unassigned_students.append({
                'id': sp.user.id,
                'email': sp.user.email,
                'first_name': sp.user.first_name,
                'last_name': sp.user.last_name,
                'is_active': sp.user.is_active,
                'start_date': sp.start_date,
                'end_date': sp.end_date,
                'categories': list(sp.courses.values_list('title', flat=True)),
                'student_type': sp.student_type,
            })

        return response.Response({
            'mentors': mentors_data,
            'unassigned_students': unassigned_students,
            'total_mentors': len(mentors_data),
            'total_students': total_students_count,
            'total_unassigned': len(unassigned_students),
        })


class AdminReportsView(views.APIView):
    """Real report stats: quiz pass rate, submission stats, per-student breakdown, and per-course performance metrics."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        live_mode = request.query_params.get('live_mode') == 'true'

        from apps.courses.models import Course
        from apps.lessons.models import Lesson, LessonProgress
        from apps.quizzes.models import Quiz, QuizAttempt
        from apps.assignments.models import Assignment, AssignmentSubmission
        from apps.users.models import StudentProfile

        # 1. Base querysets filtered by live_mode
        courses_qs = Course.objects.filter(is_mentoring_track=live_mode).select_related('category')
        total_courses_count = courses_qs.count()

        total_lessons_in_platform = Lesson.objects.filter(module__course__is_mentoring_track=live_mode).count()
        completed_records_count = LessonProgress.objects.filter(
            lesson__module__course__is_mentoring_track=live_mode, completed=True
        ).count()

        # Pre-aggregate item counts per course
        lesson_counts = dict(
            Lesson.objects.filter(module__course__is_mentoring_track=live_mode)
            .values('module__course_id')
            .annotate(cnt=Count('id'))
            .values_list('module__course_id', 'cnt')
        )
        quiz_counts = dict(
            Quiz.objects.filter(module__course__is_mentoring_track=live_mode)
            .values('module__course_id')
            .annotate(cnt=Count('id'))
            .values_list('module__course_id', 'cnt')
        )
        assignment_counts = dict(
            Assignment.objects.filter(module__course__is_mentoring_track=live_mode)
            .values('module__course_id')
            .annotate(cnt=Count('id'))
            .values_list('module__course_id', 'cnt')
        )

        # Pre-aggregate quiz attempt stats per course
        quiz_attempts_total = dict(
            QuizAttempt.objects.filter(quiz__module__course__is_mentoring_track=live_mode)
            .values('quiz__module__course_id')
            .annotate(cnt=Count('id'))
            .values_list('quiz__module__course_id', 'cnt')
        )
        quiz_attempts_passed = dict(
            QuizAttempt.objects.filter(quiz__module__course__is_mentoring_track=live_mode, passed=True)
            .values('quiz__module__course_id')
            .annotate(cnt=Count('id'))
            .values_list('quiz__module__course_id', 'cnt')
        )

        # Pre-aggregate assignment submission stats per course
        assignment_submissions = dict(
            AssignmentSubmission.objects.filter(assignment__module__course__is_mentoring_track=live_mode)
            .values('assignment__module__course_id')
            .annotate(cnt=Count('id'))
            .values_list('assignment__module__course_id', 'cnt')
        )

        # Pre-aggregate enrolled students count per course
        student_courses_m2m = StudentProfile.courses.through.objects.filter(
            course__is_mentoring_track=live_mode
        ).values('course_id').annotate(cnt=Count('studentprofile_id')).values_list('course_id', 'cnt')
        enrolled_counts_map = dict(student_courses_m2m)

        # Pre-aggregate completion per student per course
        student_completed_lessons = dict(
            LessonProgress.objects.filter(completed=True, lesson__module__course__is_mentoring_track=live_mode)
            .values('student_id', 'lesson__module__course_id')
            .annotate(cnt=Count('id'))
            .values_list('student_id', 'lesson__module__course_id', 'cnt')
        )
        # Convert (student_id, course_id) -> cnt into nested dict: course_id -> { student_id: cnt }
        course_student_lessons = {}
        for (sid, cid), cnt in student_completed_lessons.items():
            if cid not in course_student_lessons:
                course_student_lessons[cid] = {}
            course_student_lessons[cid][sid] = cnt

        # Build Per-Course Analytics
        courses_analytics = []
        for course in courses_qs:
            c_id = course.id
            t_lessons = lesson_counts.get(c_id, 0)
            t_quizzes = quiz_counts.get(c_id, 0)
            t_assignments = assignment_counts.get(c_id, 0)
            total_items = t_lessons + t_quizzes + t_assignments
            enrolled = enrolled_counts_map.get(c_id, 0)

            # Quiz pass rate %
            q_total = quiz_attempts_total.get(c_id, 0)
            q_passed = quiz_attempts_passed.get(c_id, 0)
            quiz_pass_rate = round((q_passed / q_total) * 100, 1) if q_total > 0 else 0.0

            # Assignment submission rate %
            a_subs = assignment_submissions.get(c_id, 0)
            assign_sub_rate = round((a_subs / (enrolled * t_assignments)) * 100, 1) if (enrolled > 0 and t_assignments > 0) else 0.0

            # Course avg completion calculation
            student_progress_list = []
            if enrolled > 0 and total_items > 0:
                s_map = course_student_lessons.get(c_id, {})
                for sid, done_cnt in s_map.items():
                    pct = min(round((done_cnt / total_items) * 100, 1), 100.0)
                    student_progress_list.append(pct)
            
            avg_course_comp = round(sum(student_progress_list) / enrolled, 1) if (enrolled > 0 and len(student_progress_list) > 0) else 0.0

            courses_analytics.append({
                'id': c_id,
                'title': course.title,
                'category_name': course.category.name if course.category else 'General',
                'is_mentoring_track': course.is_mentoring_track,
                'total_lessons': t_lessons,
                'total_quizzes': t_quizzes,
                'total_assignments': t_assignments,
                'total_items': total_items,
                'enrolled_students_count': enrolled,
                'avg_completion_pct': avg_course_comp,
                'quiz_pass_rate': quiz_pass_rate,
                'assignment_submission_rate': assign_sub_rate,
            })

        # 2. Per-Student Roster Breakdown & Completion Distribution
        students_qs = CustomUser.objects.filter(role='STUDENT').select_related('student_profile').prefetch_related('student_profile__courses')
        if live_mode:
            students_qs = students_qs.filter(
                Q(student_profile__student_type='LIVE_CLASS') | Q(student_profile__student_type='BOTH')
            )
        else:
            students_qs = students_qs.filter(
                Q(student_profile__student_type='COURSE') | Q(student_profile__student_type='BOTH')
            )
            
        total_students_count = students_qs.count()
        students = students_qs.order_by('first_name')

        student_data = []
        sum_of_percentages = 0.0

        distribution_buckets = {
            '0_25': 0,
            '26_50': 0,
            '51_75': 0,
            '76_100': 0,
        }

        # Cache course totals map for student calculation
        course_totals = {c['id']: c['total_items'] for c in courses_analytics}

        for s in students:
            student_courses = s.student_profile.courses.all() if hasattr(s, 'student_profile') and s.student_profile else []
            total_progress = 0.0
            course_count = 0
            
            for course in student_courses:
                tot = course_totals.get(course.id, 0)
                if tot > 0:
                    completed_lessons = LessonProgress.objects.filter(student=s, lesson__module__course=course, completed=True).count()
                    passed_quizzes = QuizAttempt.objects.filter(
                        student=s, quiz__module__course=course, passed=True
                    ).values('quiz').distinct().count()
                    submitted_assignments = AssignmentSubmission.objects.filter(
                        student=s, assignment__module__course=course
                    ).values('assignment').distinct().count()
                    
                    course_progress = ((completed_lessons + passed_quizzes + submitted_assignments) / tot) * 100
                    total_progress += course_progress
                    course_count += 1
            
            completion_percentage = round(total_progress / course_count, 1) if course_count > 0 else 0.0
            sum_of_percentages += completion_percentage
            
            if completion_percentage <= 25:
                distribution_buckets['0_25'] += 1
            elif completion_percentage <= 50:
                distribution_buckets['26_50'] += 1
            elif completion_percentage <= 75:
                distribution_buckets['51_75'] += 1
            else:
                distribution_buckets['76_100'] += 1

            total_completed_all = LessonProgress.objects.filter(student=s, completed=True).count()

            student_data.append({
                'id': s.id,
                'email': s.email,
                'first_name': s.first_name,
                'last_name': s.last_name,
                'is_active': s.is_active,
                'course_duration': getattr(s.student_profile, 'course_duration', None) if hasattr(s, 'student_profile') else None,
                'lessons_completed': total_completed_all,
                'completion_percentage': completion_percentage,
                'enrolled_courses_count': len(student_courses),
            })

        avg_course_completion = round(sum_of_percentages / total_students_count, 1) if total_students_count > 0 else 0.0

        top_performing_courses = sorted(courses_analytics, key=lambda x: x['avg_completion_pct'], reverse=True)[:5]

        return response.Response({
            'avg_course_completion': avg_course_completion,
            'total_lessons_completed': completed_records_count,
            'total_lessons_in_platform': total_lessons_in_platform,
            'total_students_count': total_students_count,
            'total_courses_count': total_courses_count,
            'courses_analytics': courses_analytics,
            'top_performing_courses': top_performing_courses,
            'completion_distribution': distribution_buckets,
            'students': student_data,
        })


class BroadcastAnnouncementView(views.APIView):
    """Admin broadcasts a notification to all users or a specific role."""
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        title = request.data.get('title', '').strip()
        message = request.data.get('message', '').strip()
        target_role = request.data.get('target_role', 'ALL')  # ALL | STAFF | STUDENT

        if not title or not message:
            return response.Response({"error": "Title and message are required."}, status=status.HTTP_400_BAD_REQUEST)

        if target_role == 'STAFF':
            recipients = list(CustomUser.objects.filter(role='STAFF', is_active=True))
        elif target_role == 'STUDENT':
            recipients = list(CustomUser.objects.filter(role='STUDENT', is_active=True))
        else:
            recipients = list(CustomUser.objects.filter(role__in=['STAFF', 'STUDENT'], is_active=True))

        notifications = [
            Notification(recipient=user, title=title, message=message)
            for user in recipients
        ]
        Notification.objects.bulk_create(notifications)

        AuditLog.objects.create(
            user=request.user,
            action=f"Broadcast announcement '{title}' to {len(notifications)} {target_role} users",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return response.Response({
            "message": f"Broadcast sent to {len(notifications)} recipients.",
            "count": len(notifications)
        }, status=status.HTTP_201_CREATED)
