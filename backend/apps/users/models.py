from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'SUPER_ADMIN')
        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('SUPER_ADMIN', 'Super Admin'),
        ('STAFF', 'Staff'),
        ('STUDENT', 'Student'),
    )
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='STUDENT')
    session_id = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # Admin portal access
    date_joined = models.DateTimeField(auto_now_add=True)

    # pyrefly: ignore [bad-override]
    objects: CustomUserManager = CustomUserManager()  # pyright: ignore[reportIncompatibleVariableOverride]

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return f"{self.email} ({self.role})"

class StudentProfile(models.Model):
    DURATION_CHOICES = (
        ('30', '30 Days'),
        ('60', '60 Days'),
        ('90', '90 Days'),
        ('180', '180 Days'),
        ('365', '365 Days'),
        ('CUSTOM', 'Custom Dates'),
    )
    STUDENT_TYPE_CHOICES = (
        ('COURSE', 'Course Student'),
        ('LIVE_CLASS', 'Live Class Student'),
        ('BOTH', 'Both'),
    )
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='student_profile')
    phone = models.CharField(max_length=20, blank=True, null=True)
    profile_photo = models.TextField(blank=True, null=True)
    course_duration = models.CharField(max_length=10, choices=DURATION_CHOICES, default='90')
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    student_type = models.CharField(max_length=20, choices=STUDENT_TYPE_CHOICES, default='COURSE')
    courses = models.ManyToManyField('courses.Course', related_name='enrolled_students', blank=True)
    assigned_staff = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_students',
        limit_choices_to={'role': 'STAFF'}
    )
    assigned_live_staff = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_live_students',
        limit_choices_to={'role': 'STAFF'}
    )

    def __str__(self):
        return f"Student: {self.user.email}"

class StaffProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='staff_profile')
    category = models.ForeignKey(
        'categories.Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff_profiles'
    )

    def __str__(self):
        return f"Staff: {self.user.email} (Category: {self.category.name if self.category else 'None'})"

class StudentAttendance(models.Model):
    STATUS_CHOICES = (
        ('PRESENT', 'Present'),
        ('ABSENT', 'Absent'),
        ('LATE', 'Late'),
    )
    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='attendance_records')
    # pyrefly: ignore [implicit-import]
    date = models.DateField(default=models.functions.Now)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PRESENT')
    first_login = models.TimeField(null=True, blank=True)

    class Meta:
        unique_together = ('student', 'date')

    def __str__(self):
        return f"{self.student.email} - {self.date} ({self.status})"

class LoginHistory(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='login_history')
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.email} logged in at {self.timestamp}"


class PasswordResetOTP(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='password_reset_otps')
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        from django.utils import timezone
        from datetime import timedelta
        return not self.is_used and self.created_at >= timezone.now() - timedelta(minutes=10)

