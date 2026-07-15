from django.utils import timezone
from datetime import timedelta
from rest_framework import serializers
from apps.users.models import CustomUser, StudentProfile
from apps.categories.models import Category
from apps.categories.serializers import CategorySerializer  # to serialize category details on read if needed

class StudentSerializer(serializers.ModelSerializer):
    # Nested fields mapped to student_profile
    phone = serializers.CharField(source='student_profile.phone', required=False, allow_blank=True, allow_null=True)
    profile_photo = serializers.CharField(source='student_profile.profile_photo', required=False, allow_blank=True, allow_null=True)
    course_duration = serializers.ChoiceField(source='student_profile.course_duration', choices=StudentProfile.DURATION_CHOICES, default='90')
    start_date = serializers.DateField(source='student_profile.start_date', required=False, allow_null=True)
    end_date = serializers.DateField(source='student_profile.end_date', required=False, allow_null=True)
    notes = serializers.CharField(source='student_profile.notes', required=False, allow_blank=True, allow_null=True)
    
    # Categories assignments
    categories = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        many=True,
        required=False,
        source='student_profile.categories'
    )
    assigned_staff = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role='STAFF'),
        required=False,
        allow_null=True,
        source='student_profile.assigned_staff'
    )
    assigned_staff_name = serializers.SerializerMethodField(read_only=True)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 'is_active', 'date_joined',
            'phone', 'profile_photo', 'course_duration', 'start_date', 'end_date',
            'notes', 'categories', 'assigned_staff', 'assigned_staff_name', 'password'
        ]
        read_only_fields = ['id', 'date_joined', 'assigned_staff_name']

    def get_assigned_staff_name(self, obj):
        profile = getattr(obj, 'student_profile', None)
        if profile and profile.assigned_staff:
            return f"{profile.assigned_staff.first_name} {profile.assigned_staff.last_name}".strip() or profile.assigned_staff.email
        return None

    def calculate_end_date(self, start_date, duration):
        if not start_date:
            start_date = timezone.now().date()
        if duration == '30':
            return start_date + timedelta(days=30)
        elif duration == '60':
            return start_date + timedelta(days=60)
        elif duration == '90':
            return start_date + timedelta(days=90)
        elif duration == '180':
            return start_date + timedelta(days=180)
        elif duration == '365':
            return start_date + timedelta(days=365)
        return None

    def create(self, validated_data):
        profile_data = validated_data.pop('student_profile', {})
        categories = profile_data.pop('categories', [])
        password = validated_data.pop('password', 'apex123')

        # Auto-assign staff if request user is STAFF
        request = self.context.get('request')
        assigned_staff = profile_data.get('assigned_staff')
        if not assigned_staff and request and request.user and request.user.role == 'STAFF':
            assigned_staff = request.user

        validated_data['role'] = 'STUDENT'
        user = CustomUser.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()

        # Date calculations
        start_date = profile_data.get('start_date')
        if not start_date:
            start_date = timezone.now().date()
        duration = profile_data.get('course_duration', '90')

        if duration != 'CUSTOM':
            end_date = self.calculate_end_date(start_date, duration)
        else:
            end_date = profile_data.get('end_date')

        profile = StudentProfile.objects.create(
            user=user,
            phone=profile_data.get('phone', ''),
            profile_photo=profile_data.get('profile_photo', ''),
            course_duration=duration,
            start_date=start_date,
            end_date=end_date,
            notes=profile_data.get('notes', ''),
            assigned_staff=assigned_staff
        )
        if categories:
            profile.categories.set(categories)
        
        # Auto-assign category from mentor
        if assigned_staff and hasattr(assigned_staff, 'staff_profile') and assigned_staff.staff_profile.category:
            profile.categories.add(assigned_staff.staff_profile.category)

        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('student_profile', {})
        categories = profile_data.pop('categories', None)
        password = validated_data.pop('password', None)

        if password:
            instance.set_password(password)

        instance.email = validated_data.get('email', instance.email)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.save()

        profile = instance.student_profile
        profile.phone = profile_data.get('phone', profile.phone)
        profile.profile_photo = profile_data.get('profile_photo', profile.profile_photo)
        profile.notes = profile_data.get('notes', profile.notes)
        if 'assigned_staff' in profile_data:
            profile.assigned_staff = profile_data.get('assigned_staff')

        # Recalculate duration/end dates
        duration = profile_data.get('course_duration', profile.course_duration)
        start_date = profile_data.get('start_date', profile.start_date)

        profile.course_duration = duration
        profile.start_date = start_date

        if duration != 'CUSTOM':
            profile.end_date = self.calculate_end_date(start_date, duration)
        else:
            profile.end_date = profile_data.get('end_date', profile.end_date)

        profile.save()

        if categories is not None:
            profile.categories.set(categories)

        # Auto-assign category from mentor
        if profile.assigned_staff and hasattr(profile.assigned_staff, 'staff_profile') and profile.assigned_staff.staff_profile.category:
            profile.categories.add(profile.assigned_staff.staff_profile.category)

        return instance
