from rest_framework import serializers
from apps.courses.models import Course, LiveClass
from apps.categories.models import Category

class CourseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    mentor_name = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    # category is auto-assigned for STAFF; make optional so staff don't need to send it
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True
    )
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'description', 'thumbnail', 
            'category', 'category_name', 'mentor', 'mentor_name',
            'is_published', 'status', 
            'requirements', 'outcomes', 'learning_path', 
            'instructor_name', 'instructor_role', 'created_at',
            'progress_percentage', 'is_mentoring_track', 'created_by_name'
        ]

    def get_mentor_name(self, obj):
        if obj.mentor:
            return f"{obj.mentor.first_name} {obj.mentor.last_name}".strip() or obj.mentor.email
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return "Unknown"

    def get_progress_percentage(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or request.user.role != 'STUDENT':
            return None
        
        precomputed = self.context.get('precomputed_progress')
        if precomputed:
            lesson_counts = precomputed.get('lesson_counts', {})
            quiz_counts = precomputed.get('quiz_counts', {})
            assignment_counts = precomputed.get('assignment_counts', {})
            completed_lessons = precomputed.get('completed_lessons', {})
            passed_quizzes = precomputed.get('passed_quizzes', {})
            submitted_assignments = precomputed.get('submitted_assignments', {})
            
            total_lessons = lesson_counts.get(obj.id, 0)
            total_quizzes = quiz_counts.get(obj.id, 0)
            total_assignments = assignment_counts.get(obj.id, 0)
            
            total_items = total_lessons + total_quizzes + total_assignments
            if total_items == 0:
                return 0.0
                
            comp_lessons = completed_lessons.get(obj.id, 0)
            pass_quizzes = passed_quizzes.get(obj.id, 0)
            sub_assigns = submitted_assignments.get(obj.id, 0)
            
            completed_items = comp_lessons + pass_quizzes + sub_assigns
            return round((completed_items / total_items) * 100, 1)

        from apps.lessons.models import Lesson, LessonProgress
        from apps.quizzes.models import Quiz, QuizAttempt
        from apps.assignments.models import Assignment, AssignmentSubmission

        total_lessons = Lesson.objects.filter(module__course=obj).count()
        total_quizzes = Quiz.objects.filter(module__course=obj).count()
        total_assignments = Assignment.objects.filter(module__course=obj).count()

        total_items = total_lessons + total_quizzes + total_assignments
        if total_items == 0:
            return 0.0
            
        completed_lessons = LessonProgress.objects.filter(
            student=request.user,
            lesson__module__course=obj,
            completed=True
        ).count()

        passed_quizzes = QuizAttempt.objects.filter(
            student=request.user,
            quiz__module__course=obj,
            passed=True
        ).values('quiz').distinct().count()

        submitted_assignments = AssignmentSubmission.objects.filter(
            student=request.user,
            assignment__module__course=obj
        ).values('assignment').distinct().count()

        completed_items = completed_lessons + passed_quizzes + submitted_assignments
        return round((completed_items / total_items) * 100, 1)

from apps.users.models import CustomUser

class LiveClassSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    students_details = serializers.SerializerMethodField()
    meeting_url = serializers.CharField(required=True)
    recording_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    course = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(),
        required=False,
        allow_null=True
    )
    students = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=CustomUser.objects.filter(role='STUDENT'),
        required=False
    )

    class Meta:
        model = LiveClass
        fields = [
            'id', 'course', 'course_title', 'category', 'title',
            'scheduled_time', 'meeting_url', 'recording_url', 'status', 'created_by_name',
            'students', 'students_details'
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return "System Admin"

    def get_students_details(self, obj):
        return [
            {
                'id': s.id,
                'name': f"{s.first_name} {s.last_name}".strip() or s.email,
                'email': s.email
            }
            for s in obj.students.all()
        ]

    def validate_meeting_url(self, value):
        if value and isinstance(value, str):
            val = value.strip()
            if val and not (val.startswith('http://') or val.startswith('https://')):
                return f"https://{val}"
            return val
        return value

    def validate_course(self, value):
        if not value:
            return value
        request = self.context.get('request')
        if request and request.user and request.user.role == 'STAFF':
            category = getattr(request.user, 'staff_profile', None) and request.user.staff_profile.category
            if category and value.category and value.category != category:
                raise serializers.ValidationError("You do not have permission to schedule a live class for this course.")
        return value
