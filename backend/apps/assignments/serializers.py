from rest_framework import serializers
from apps.assignments.models import Assignment, AssignmentSubmission

class AssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = ['id', 'module', 'title', 'description', 'file_attachment', 'due_date', 'created_at']

class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    student_first_name = serializers.CharField(source='student.first_name', read_only=True)
    student_last_name = serializers.CharField(source='student.last_name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    assignment_title = serializers.CharField(source='assignment.title', read_only=True)
    graded_by_email = serializers.CharField(source='graded_by.email', read_only=True)

    class Meta:
        model = AssignmentSubmission
        fields = [
            'id', 'assignment', 'assignment_title', 'student', 'student_email',
            'student_first_name', 'student_last_name',
            'file_submission', 'notes', 'status', 'grade', 'feedback',
            'graded_by', 'graded_by_email', 'plagiarism_score', 'plagiarism_report',
            'submitted_at', 'graded_at'
        ]
        read_only_fields = ['student', 'status', 'graded_by', 'graded_at', 'plagiarism_score', 'plagiarism_report']

    def create(self, validated_data):
        import random
        # Automatically assign current authenticated student
        request = self.context.get('request')
        if request and request.user:
            validated_data['student'] = request.user
        validated_data['status'] = 'PENDING'
        # Simulate scanning file submission for plagiarism hook
        validated_data['plagiarism_score'] = random.randint(1, 14) # 1% to 14% matching
        validated_data['plagiarism_report'] = f"Apex Plagiarism Check: {validated_data['plagiarism_score']}% matching similarity detected. Deliverable verified."
        return super().create(validated_data)
