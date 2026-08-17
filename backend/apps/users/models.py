# pyrefly: ignore [missing-import]
from django.db import models
# pyrefly: ignore [missing-import]
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

    def set_password(self, raw_password):
        if raw_password:
            self._raw_password = str(raw_password).strip()
        super().set_password(raw_password)

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
        # pyrefly: ignore [missing-import]
        from django.utils import timezone
        from datetime import timedelta
        return not self.is_used and self.created_at >= timezone.now() - timedelta(minutes=10)


# ── Automatic Welcome Email Signal ─────────────────────────────────────────────
# pyrefly: ignore [missing-import]
from django.db.models.signals import post_save
# pyrefly: ignore [missing-import]
from django.dispatch import receiver

@receiver(post_save, sender=CustomUser)
def send_welcome_email_on_user_create(sender, instance, created, **kwargs):
    """
    Guarantees that ANY user created in Django (via Django Admin, API, or shell)
    automatically receives a Welcome Email with login credentials and portal links.
    """
    if created and instance.email:
        if getattr(instance, '_welcome_email_sent', False):
            return
        instance._welcome_email_sent = True

        raw_pwd = getattr(instance, '_raw_password', None) or 'apex123'
        role = getattr(instance, 'role', 'STUDENT')
        
        # pyrefly: ignore [missing-import]
        from django.conf import settings
        frontend_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        
        stype = 'COURSE'
        if hasattr(instance, 'student_profile') and instance.student_profile:
            stype = getattr(instance.student_profile, 'student_type', 'COURSE')

        if role == 'LIVE_STUDENT' or stype == 'LIVE_CLASS':
            login_url = f"{frontend_base}/student/live-login"
            role_label = 'LIVE_STUDENT'
        elif role == 'STUDENT':
            login_url = f"{frontend_base}/student/login"
            role_label = 'STUDENT'
        else:
            login_url = f"{frontend_base}/staff/login"
            role_label = role

        try:
            from apps.core.emails import send_welcome_email
            send_welcome_email(
                first_name=instance.first_name,
                last_name=instance.last_name,
                email=instance.email,
                password=raw_pwd,
                role=role_label,
                login_url=login_url,
            )
        except Exception as err:
            import logging
            logging.getLogger(__name__).error(f"[User Signal] Failed to dispatch welcome email for {instance.email}: {err}")


