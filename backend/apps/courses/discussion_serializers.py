from rest_framework import serializers
from apps.courses.discussion_models import CourseDiscussionPost, CourseDiscussionComment
from apps.users.models import CustomUser

class UserShortSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'name', 'role']

    def get_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.email

class CourseDiscussionCommentSerializer(serializers.ModelSerializer):
    user_details = UserShortSerializer(source='user', read_only=True)

    class Meta:
        model = CourseDiscussionComment
        fields = ['id', 'post', 'user', 'user_details', 'content', 'created_at']
        read_only_fields = ['user']

class CourseDiscussionPostSerializer(serializers.ModelSerializer):
    user_details = UserShortSerializer(source='user', read_only=True)
    course_title = serializers.SerializerMethodField()
    mentor_name = serializers.SerializerMethodField()
    comments = CourseDiscussionCommentSerializer(many=True, read_only=True)
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = CourseDiscussionPost
        fields = [
            'id', 'course', 'course_title', 'mentor_name', 'user', 'user_details', 
            'title', 'content', 'comments', 'comments_count', 'created_at'
        ]
        read_only_fields = ['user']
        extra_kwargs = {
            'course': {'required': False, 'allow_null': True}
        }

    def get_course_title(self, obj):
        if obj.course:
            return obj.course.title
        return "Live Mentoring Track"

    def get_mentor_name(self, obj):
        if obj.course and obj.course.mentor:
            name = f"{obj.course.mentor.first_name} {obj.course.mentor.last_name}".strip()
            return name if name else obj.course.mentor.email
        prof = getattr(obj.user, 'student_profile', None)
        if prof:
            mentor = prof.assigned_live_staff or prof.assigned_staff
            if mentor:
                name = f"{mentor.first_name} {mentor.last_name}".strip()
                return name if name else mentor.email
        return "Staff Mentor"

    def get_comments_count(self, obj):
        return obj.comments.count()
