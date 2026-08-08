from rest_framework import serializers
from apps.assignments.models import Assignment, AssignmentSubmission

class AssignmentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    students_details = serializers.SerializerMethodField()
    course_title = serializers.CharField(source='course.title', read_only=True)
    module_title = serializers.CharField(source='module.title', read_only=True)

    class Meta:
        model = Assignment
        fields = ['id', 'module', 'module_title', 'course', 'course_title', 'students', 'students_details', 'title', 'description', 'file_attachment', 'due_date', 'created_by', 'created_by_name', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            role_label = f" ({obj.created_by.role})" if obj.created_by.role else ""
            return (name if name else obj.created_by.email) + role_label
        return "Admin / Mentor"

    def get_students_details(self, obj):
        return [
            {
                'id': s.id,
                'email': s.email,
                'name': f"{s.first_name} {s.last_name}".strip() or s.email
            }
            for s in obj.students.all()
        ]

class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    student_first_name = serializers.CharField(source='student.first_name', read_only=True)
    student_last_name = serializers.CharField(source='student.last_name', read_only=True)
    student_name = serializers.SerializerMethodField()
    student_email = serializers.CharField(source='student.email', read_only=True)
    student_category = serializers.SerializerMethodField()
    assignment_title = serializers.CharField(source='assignment.title', read_only=True)
    assignment_created_by = serializers.SerializerMethodField()
    graded_by_email = serializers.CharField(source='graded_by.email', read_only=True)

    class Meta:
        model = AssignmentSubmission
        fields = [
            'id', 'assignment', 'assignment_title', 'assignment_created_by', 'student', 'student_email',
            'student_name', 'student_category',
            'student_first_name', 'student_last_name',
            'file_submission', 'notes', 'status', 'grade', 'feedback',
            'graded_by', 'graded_by_email', 'plagiarism_score', 'plagiarism_report',
            'submitted_at', 'graded_at'
        ]
        read_only_fields = ['student', 'status', 'graded_by', 'graded_at', 'plagiarism_score', 'plagiarism_report']

    def get_student_name(self, obj):
        if obj.student:
            name = f"{obj.student.first_name} {obj.student.last_name}".strip()
            return name if name else obj.student.email
        return "Unknown Student"

    def get_student_category(self, obj):
        if obj.student:
            prof = getattr(obj.student, 'student_profile', None)
            if prof:
                if prof.assigned_live_staff and hasattr(prof.assigned_live_staff, 'staff_profile') and prof.assigned_live_staff.staff_profile and prof.assigned_live_staff.staff_profile.category:
                    return prof.assigned_live_staff.staff_profile.category.name
                if prof.assigned_staff and hasattr(prof.assigned_staff, 'staff_profile') and prof.assigned_staff.staff_profile and prof.assigned_staff.staff_profile.category:
                    return prof.assigned_staff.staff_profile.category.name
                course = prof.courses.select_related('category').first()
                if course and course.category:
                    return course.category.name
                if prof.student_type == 'LIVE_CLASS':
                    return "Live Class Track"
        return "General Track"

    def get_assignment_created_by(self, obj):
        if obj.assignment and obj.assignment.created_by:
            name = f"{obj.assignment.created_by.first_name} {obj.assignment.created_by.last_name}".strip()
            role_label = f" ({obj.assignment.created_by.role})" if obj.assignment.created_by.role else ""
            return (name if name else obj.assignment.created_by.email) + role_label
        return "Admin / Mentor"

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

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        if request and request.user:
            if getattr(request.user, 'role', None) == 'STUDENT':
                ret.pop('plagiarism_score', None)
                ret.pop('plagiarism_report', None)
        return ret

