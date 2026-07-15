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

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'description', 'thumbnail', 
            'category', 'category_name', 'mentor', 'mentor_name',
            'is_published', 'status', 
            'requirements', 'outcomes', 'learning_path', 
            'instructor_name', 'instructor_role', 'created_at',
            'progress_percentage'
        ]

    def get_mentor_name(self, obj):
        if obj.mentor:
            return f"{obj.mentor.first_name} {obj.mentor.last_name}".strip() or obj.mentor.email
        return None

    def get_progress_percentage(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or request.user.role != 'STUDENT':
            return None
        
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

        passed_quizzes = 0
        quizzes = Quiz.objects.filter(module__course=obj)
        for quiz in quizzes:
            if QuizAttempt.objects.filter(student=request.user, quiz=quiz, passed=True).exists():
                passed_quizzes += 1

        submitted_assignments = 0
        assignments = Assignment.objects.filter(module__course=obj)
        for assign in assignments:
            if AssignmentSubmission.objects.filter(student=request.user, assignment=assign).exists():
                submitted_assignments += 1

        completed_items = completed_lessons + passed_quizzes + submitted_assignments
        return round((completed_items / total_items) * 100, 1)

class LiveClassSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = LiveClass
        fields = ['id', 'course', 'course_title', 'title', 'scheduled_time', 'meeting_url', 'status']
