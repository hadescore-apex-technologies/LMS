from rest_framework import serializers
from apps.lessons.models import Lesson, LessonBookmark, LessonNote

class LessonSerializer(serializers.ModelSerializer):
    # Expose video attributes if a video exists for this lesson
    video_id = serializers.IntegerField(source='video.id', read_only=True)
    cf_stream_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    video_status = serializers.CharField(source='video.status', read_only=True)
    video_duration = serializers.IntegerField(source='video.duration', read_only=True)
    
    locked = serializers.SerializerMethodField()
    completed = serializers.SerializerMethodField()
    resume_time = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id', 'module', 'title', 'content', 'order', 'thumbnail',
            'video_id', 'cf_stream_id', 'video_status', 'video_duration', 
            'pdf_ppt_url', 'zip_source_url', 'external_links', 
            'additional_notes', 'faqs', 'estimated_duration',
            'locked', 'completed', 'resume_time'
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if hasattr(instance, 'video') and instance.video:
            ret['cf_stream_id'] = instance.video.cf_stream_id
        else:
            ret['cf_stream_id'] = None
        return ret

    def create(self, validated_data):
        cf_stream_id = validated_data.pop('cf_stream_id', None)
        lesson = super().create(validated_data)
        if cf_stream_id:
            from apps.videos.models import Video
            Video.objects.create(lesson=lesson, cf_stream_id=cf_stream_id, status='ready')
        return lesson

    def update(self, instance, validated_data):
        cf_stream_id = validated_data.pop('cf_stream_id', None)
        lesson = super().update(instance, validated_data)
        
        from apps.videos.models import Video
        if cf_stream_id:
            Video.objects.update_or_create(
                lesson=lesson,
                defaults={'cf_stream_id': cf_stream_id, 'status': 'ready'}
            )
        else:
            if 'cf_stream_id' in self.initial_data:
                Video.objects.filter(lesson=lesson).delete()
                
        return lesson

    def get_locked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        user = request.user
        if user.role != 'STUDENT':
            return False
            
        course = obj.module.course
        from apps.modules.models import Module
        from apps.quizzes.models import Quiz, QuizAttempt
        
        all_course_modules = Module.objects.filter(course=course).order_by('order', 'id')
        
        earlier_modules = []
        for m in all_course_modules:
            if m.id == obj.module.id:
                break
            earlier_modules.append(m)
            
        if not earlier_modules:
            return False
            
        quizzes_to_check = Quiz.objects.filter(module__in=earlier_modules)
        if not quizzes_to_check.exists():
            return False
            
        # Check quizzes
        for quiz in quizzes_to_check:
            passed_attempt = QuizAttempt.objects.filter(student=user, quiz=quiz, passed=True).exists()
            if not passed_attempt:
                return True

        # Check assignments
        from apps.assignments.models import Assignment, AssignmentSubmission
        assignments_to_check = Assignment.objects.filter(module__in=earlier_modules)
        for assign in assignments_to_check:
            submitted = AssignmentSubmission.objects.filter(student=user, assignment=assign).exists()
            if not submitted:
                return True
                
        return False

    def get_completed(self, obj):
        # Check if progress records were prefetched to avoid N+1 query loop
        user_progress = getattr(obj, 'user_progress', None)
        if user_progress is not None:
            return any(p.completed for p in user_progress)

        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        from apps.lessons.models import LessonProgress
        return LessonProgress.objects.filter(student=request.user, lesson=obj, completed=True).exists()

    def get_resume_time(self, obj):
        # Check if progress records were prefetched to avoid N+1 query loop
        user_progress = getattr(obj, 'user_progress', None)
        if user_progress is not None:
            return user_progress[0].resume_time if user_progress else 0.0

        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0.0
        from apps.lessons.models import LessonProgress
        prog = LessonProgress.objects.filter(student=request.user, lesson=obj).first()
        return prog.resume_time if prog else 0.0

class LessonBookmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonBookmark
        fields = ['id', 'lesson', 'position_seconds', 'note', 'created_at']

class LessonNoteSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    course_title = serializers.CharField(source='lesson.module.course.title', read_only=True)
    course_id = serializers.IntegerField(source='lesson.module.course.id', read_only=True)

    class Meta:
        model = LessonNote
        fields = ['id', 'lesson', 'lesson_title', 'course_id', 'course_title', 'text', 'created_at']
