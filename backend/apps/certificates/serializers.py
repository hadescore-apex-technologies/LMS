from rest_framework import serializers
from apps.certificates.models import Certificate

class CertificateSerializer(serializers.ModelSerializer):
    student_email = serializers.CharField(source='student.email', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    certificate_code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Certificate
        fields = ['id', 'student', 'student_email', 'course', 'course_title', 'certificate_code', 'file_url', 'issued_at', 'is_issued']
        read_only_fields = ['issued_at']
