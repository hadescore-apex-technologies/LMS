from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from rest_framework import serializers
from apps.users.models import CustomUser, StudentProfile
from apps.courses.models import Course

class SafePrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    """
    Tolerates invalid, stale, or deleted PKs gracefully by returning None
    instead of failing validation with a 400 error.
    """
    def to_internal_value(self, data):
        if data in (None, '', 'null', 0, '0'):
            return None
        try:
            return super().to_internal_value(data)
        except Exception:
            return None

class StudentSerializer(serializers.ModelSerializer):
    # Explicitly declare email to strip DRF's auto-added UniqueValidator.
    # Our create() handles duplicates by re-activating the existing user.
    email = serializers.EmailField(required=True)

    # Nested fields mapped to student_profile
    phone = serializers.CharField(source='student_profile.phone', required=False, allow_blank=True, allow_null=True)
    profile_photo = serializers.CharField(source='student_profile.profile_photo', required=False, allow_blank=True, allow_null=True)
    course_duration = serializers.ChoiceField(source='student_profile.course_duration', choices=StudentProfile.DURATION_CHOICES, required=False, allow_null=True)
    start_date = serializers.DateField(source='student_profile.start_date', required=False, allow_null=True)
    end_date = serializers.DateField(source='student_profile.end_date', required=False, allow_null=True)
    notes = serializers.CharField(source='student_profile.notes', required=False, allow_blank=True, allow_null=True)
    student_type = serializers.ChoiceField(source='student_profile.student_type', choices=StudentProfile.STUDENT_TYPE_CHOICES, required=False, allow_null=True)
    
    # Courses assignments
    courses = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(),
        many=True,
        required=False,
        source='student_profile.courses'
    )
    assigned_staff = SafePrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role__in=['STAFF', 'SUPER_ADMIN']),
        required=False,
        allow_null=True,
        source='student_profile.assigned_staff'
    )
    assigned_live_staff = SafePrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role__in=['STAFF', 'SUPER_ADMIN']),
        required=False,
        allow_null=True,
        source='student_profile.assigned_live_staff'
    )
    assigned_staff_name = serializers.SerializerMethodField(read_only=True)
    assigned_live_staff_name = serializers.SerializerMethodField(read_only=True)
    courses_names = serializers.SerializerMethodField(read_only=True)
    has_certificate = serializers.SerializerMethodField(read_only=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 'is_active', 'date_joined',
            'phone', 'profile_photo', 'course_duration', 'start_date', 'end_date',
            'notes', 'courses', 'courses_names', 'assigned_staff', 'assigned_staff_name', 
            'assigned_live_staff', 'assigned_live_staff_name', 'student_type', 'password',
            'has_certificate'
        ]
        read_only_fields = ['id', 'date_joined', 'assigned_staff_name', 'assigned_live_staff_name', 'courses_names', 'has_certificate']

    def get_has_certificate(self, obj):
        return getattr(obj, 'has_cert', False)

    def get_courses_names(self, obj):
        profile = getattr(obj, 'student_profile', None)
        if profile:
            return [course.title for course in profile.courses.all()]
        return []

    def validate_email(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Email address is required.")
        email = str(value).strip().lower()
        if '@' not in email:
            raise serializers.ValidationError("Please enter a valid email address.")

        # During creation, allow duplicate emails — the create() method will
        # re-activate the existing user instead of crashing.
        # During updates, DRF already handles uniqueness via the instance.
        return email

    def get_assigned_staff_name(self, obj):
        profile = getattr(obj, 'student_profile', None)
        if profile and profile.assigned_staff:
            return f"{profile.assigned_staff.first_name} {profile.assigned_staff.last_name}".strip() or profile.assigned_staff.email
        return None

    def get_assigned_live_staff_name(self, obj):
        profile = getattr(obj, 'student_profile', None)
        if profile and profile.assigned_live_staff:
            return f"{profile.assigned_live_staff.first_name} {profile.assigned_live_staff.last_name}".strip() or profile.assigned_live_staff.email
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
        courses = profile_data.pop('courses', [])
        if not courses and hasattr(self, 'initial_data'):
            courses_input = self.initial_data.get('courses') or self.initial_data.get('categories')
            if courses_input and isinstance(courses_input, list):
                courses = Course.objects.filter(Q(id__in=courses_input) | Q(category_id__in=courses_input))

        raw_pwd = validated_data.pop('password', None)
        password = raw_pwd.strip() if (raw_pwd and isinstance(raw_pwd, str) and raw_pwd.strip()) else 'apex123'

        # Auto-assign staff if request user is STAFF
        request = self.context.get('request')
        assigned_staff = profile_data.get('assigned_staff')
        assigned_live_staff = profile_data.get('assigned_live_staff')
        
        if request and request.user and request.user.role == 'STAFF':
            live_mode = request.query_params.get('live_mode') == 'true'
            if live_mode and not assigned_live_staff:
                assigned_live_staff = request.user
            elif not live_mode and not assigned_staff:
                assigned_staff = request.user

        email = validated_data.get('email', '').strip().lower()

        # ── Handle existing user with same email ──────────────────────────
        existing_user = CustomUser.objects.filter(email=email).first()

        if existing_user:
            # Re-activate and update the existing STUDENT user
            user = existing_user
            user.role = 'STUDENT'
            user.first_name = validated_data.get('first_name', user.first_name)
            user.last_name = validated_data.get('last_name', user.last_name)
            user.is_active = validated_data.get('is_active', True)
            user.set_password(password)
            user.save()

            # Re-use or create StudentProfile
            profile, profile_created = StudentProfile.objects.get_or_create(user=user)

            # Date calculations
            start_date = profile_data.get('start_date')
            if not start_date:
                start_date = timezone.now().date()
            duration = profile_data.get('course_duration', '90')

            if duration != 'CUSTOM':
                end_date = self.calculate_end_date(start_date, duration)
            else:
                end_date = profile_data.get('end_date')

            profile.phone = profile_data.get('phone', '') or profile.phone
            profile.profile_photo = profile_data.get('profile_photo', '') or profile.profile_photo
            profile.course_duration = duration
            profile.start_date = start_date
            profile.end_date = end_date
            profile.notes = profile_data.get('notes', '') or profile.notes
            profile.student_type = profile_data.get('student_type', 'COURSE') or profile.student_type
            profile.assigned_staff = assigned_staff
            if assigned_live_staff is not None or 'assigned_live_staff' in profile_data:
                profile.assigned_live_staff = assigned_live_staff
            profile.save()

            if courses:
                profile.courses.set(courses)

            return user

        # ── Fresh new user ────────────────────────────────────────────────
        validated_data['role'] = 'STUDENT'
        if 'is_active' not in validated_data:
            validated_data['is_active'] = True
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
            student_type=profile_data.get('student_type', 'COURSE'),
            assigned_staff=assigned_staff,
            assigned_live_staff=assigned_live_staff
        )
        if courses:
            profile.courses.set(courses)

        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('student_profile', {})
        courses = profile_data.pop('courses', None)
        if courses is None and hasattr(self, 'initial_data'):
            courses_input = self.initial_data.get('courses')
            if courses_input is None:
                courses_input = self.initial_data.get('categories')
            if courses_input is not None and isinstance(courses_input, list):
                courses = Course.objects.filter(Q(id__in=courses_input) | Q(category_id__in=courses_input))

        password = validated_data.pop('password', None)

        if password:
            instance.set_password(password)

        instance.email = validated_data.get('email', instance.email)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        profile = getattr(instance, 'student_profile', None)
        if not profile:
            profile = StudentProfile.objects.create(user=instance)
        profile.phone = profile_data.get('phone', profile.phone)
        profile.profile_photo = profile_data.get('profile_photo', profile.profile_photo)
        profile.notes = profile_data.get('notes', profile.notes)
        if profile_data.get('student_type'):
            profile.student_type = profile_data.get('student_type')
        request = self.context.get('request')
        if hasattr(self, 'initial_data') and 'assigned_staff' in self.initial_data:
            profile.assigned_staff = profile_data.get('assigned_staff')
        elif request and request.user and request.user.role == 'STAFF':
            live_mode = request.query_params.get('live_mode') == 'true'
            if not live_mode and not profile.assigned_staff:
                profile.assigned_staff = request.user

        if hasattr(self, 'initial_data') and 'assigned_live_staff' in self.initial_data:
            profile.assigned_live_staff = profile_data.get('assigned_live_staff')
        elif request and request.user and request.user.role == 'STAFF':
            live_mode = request.query_params.get('live_mode') == 'true'
            if live_mode and not profile.assigned_live_staff:
                profile.assigned_live_staff = request.user

        # Recalculate duration/end dates
        duration = profile_data.get('course_duration', profile.course_duration)
        start_date = profile_data.get('start_date', profile.start_date)

        profile.course_duration = duration
        profile.start_date = start_date

        if duration != 'CUSTOM':
            profile.end_date = self.calculate_end_date(start_date, duration)
        else:
            profile.end_date = profile_data.get('end_date', profile.end_date)

        # Auto-reactivate account if new end_date is valid/future
        if profile.end_date and profile.end_date >= timezone.now().date():
            instance.is_active = True
        
        instance.save()
        profile.save()

        if courses is not None:
            profile.courses.set(courses)

        return instance
