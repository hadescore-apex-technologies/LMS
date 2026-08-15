from rest_framework import serializers
from apps.certificates.models import Certificate
from apps.courses.models import Course

class CertificateSerializer(serializers.ModelSerializer):
    student_email = serializers.CharField(source='student.email', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True, default='')
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all(), required=True, allow_null=False)
    certificate_code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Certificate
        fields = ['id', 'student', 'student_email', 'course', 'course_title', 'certificate_code', 'file_url', 'issued_at', 'is_issued']
        read_only_fields = ['issued_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        raw_url = data.get('file_url') or ''

        # If file_url contains the invalid R2 S3 endpoint or is missing, route to live dynamic PDF endpoint
        if not raw_url or 'cloudflarestorage.com' in raw_url:
            path = f'/api/certificates/{instance.id}/download/'
            data['file_url'] = request.build_absolute_uri(path) if request else path
        elif raw_url.startswith('/media/'):
            data['file_url'] = request.build_absolute_uri(raw_url) if request else raw_url

        return data
