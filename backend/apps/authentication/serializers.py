# pyrefly: ignore [missing-import]
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
# pyrefly: ignore [missing-import]
from rest_framework import exceptions
from apps.users.models import CustomUser, StudentProfile
# pyrefly: ignore [missing-import]
from django.utils import timezone

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Append role, session_id and user details to JWT payload
        token['email'] = user.email
        token['role'] = user.role
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['session_id'] = getattr(user, 'session_id', '') or ''
        if user.role == 'STUDENT' and hasattr(user, 'student_profile'):
            token['courses'] = [c.title for c in user.student_profile.courses.all()]
        else:
            token['courses'] = []
        return token

    def validate(self, attrs):
        # Normalize email input (trim whitespace & lowercase)
        if 'email' in attrs and isinstance(attrs['email'], str):
            attrs['email'] = attrs['email'].strip().lower()
        if 'username' in attrs and isinstance(attrs['username'], str):
            attrs['username'] = attrs['username'].strip().lower()

        # Complete simplejwt standard validation
        data = super().validate(attrs)
        user = self.user
        today = timezone.now().date()

        # Handle Student duration, activation status, and daily attendance logging
        if user.role == 'STUDENT':
            from apps.users.models import StudentAttendance
            now_local = timezone.localtime(timezone.now())
            att, created = StudentAttendance.objects.get_or_create(
                student=user,
                date=today,
                defaults={'status': 'PRESENT', 'first_login': now_local.time()}
            )
            if not created and (att.status != 'PRESENT' or not att.first_login):
                att.status = 'PRESENT'
                if not att.first_login:
                    att.first_login = now_local.time()
                att.save(update_fields=['status', 'first_login'])

            profile = getattr(user, 'student_profile', None)
            if profile and profile.end_date:
                if profile.end_date < today:
                    if user.is_active:
                        user.is_active = False
                        user.save(update_fields=['is_active'])
                    raise exceptions.AuthenticationFailed(
                        f"Your Course Access has Expired (allotted {profile.course_duration} days ended on {profile.end_date}). Please contact your administrator to extend your access."
                    )
                else:
                    # Valid future end_date: ensure account is active
                    if not user.is_active:
                        user.is_active = True
                        user.save(update_fields=['is_active'])
            else:
                # No end_date set: ensure account is active
                if not user.is_active:
                    user.is_active = True
                    user.save(update_fields=['is_active'])

        # Handle Staff & Admin permanent status
        if not user.is_active:
            raise exceptions.AuthenticationFailed("This account is inactive. Please contact system administrator.")
        
        # Log login history details
        from apps.users.models import LoginHistory
        request = self.context.get('request')
        ip = None
        ua = None
        if request:
            ip = request.META.get('REMOTE_ADDR')
            ua = request.META.get('HTTP_USER_AGENT')
        LoginHistory.objects.create(user=self.user, ip_address=ip, user_agent=ua)
        
        # Single Active Device Session Protection & Root Email Security Alerts
        import uuid
        new_session_id = uuid.uuid4().hex
        prev_session = getattr(user, 'session_id', None)
        full_name = f"{self.user.first_name} {self.user.last_name}".strip()

        if prev_session and user.role == 'STUDENT':
            import threading
            from apps.core.emails import send_lms_email
            ip_addr = ip or 'Unknown IP'
            user_email = user.email
            user_name = full_name or user.email
            
            def _send_concurrent_alert():
                try:
                    send_lms_email(
                        to_email='hadescore.apex.technologies@gmail.com',
                        subject=f"⚠️ Security Alert: Concurrent Login Detected for {user_email}",
                        text_body=(
                            f"Apex LMS Security Notification\n\n"
                            f"A concurrent login override was detected for student account:\n"
                            f"• User: {user_name} ({user_email})\n"
                            f"• Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
                            f"• New Login IP: {ip_addr}\n"
                            f"• Device Info: {ua or 'Web Browser'}\n\n"
                            f"Security Action Taken: Previous session token has been automatically invalidated to prevent multi-device account sharing."
                        )
                    )
                except Exception as e:
                    print(f"Failed to dispatch security alert email: {e}")
            
            threading.Thread(target=_send_concurrent_alert, daemon=True).start()

        user.session_id = new_session_id
        user.save(update_fields=['session_id'])

        courses_list = []
        student_type = None
        if self.user.role == 'STUDENT' and hasattr(self.user, 'student_profile'):
            courses_list = [c.title for c in self.user.student_profile.courses.all()]
            student_type = self.user.student_profile.student_type

        # Append user metadata directly in the API response json
        data['user'] = {
            'email': self.user.email,
            'name': full_name or self.user.first_name or self.user.email.split('@')[0],
            'role': self.user.role,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'courses': courses_list,
            'student_type': student_type
        }
        return data
