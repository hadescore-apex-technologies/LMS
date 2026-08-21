# pyrefly: ignore [missing-import]
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.authentication.serializers import CustomTokenObtainPairSerializer
# pyrefly: ignore [missing-import]
from rest_framework import views, status, response
from apps.core.permissions import IsSuperAdmin
from apps.core.models import AuditLog, PlatformSettings
# pyrefly: ignore [missing-import]
from django.utils import timezone

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RevokeAllSessionsView(views.APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        setting, created = PlatformSettings.objects.get_or_create(key='jwt_invalidated_at')
        setting.value = str(timezone.now().timestamp())
        setting.save()

        AuditLog.objects.create(
            user=request.user,
            action="Revoked all active JWT sessions (platform-wide logouts).",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return response.Response({
            "status": "success",
            "message": "All active JWT sessions successfully revoked via token blacklist."
        }, status=status.HTTP_200_OK)


import random
# pyrefly: ignore [missing-import]
from django.core.mail import send_mail
from apps.users.models import CustomUser, PasswordResetOTP

class BaseRequestPasswordResetView:
    authentication_classes = []
    permission_classes = []
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return response.Response(
                {"detail": "Email is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return response.Response(
                {"detail": "No administrator account found with this email address."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.role != 'SUPER_ADMIN':
            return response.Response(
                {"detail": "Only Super Admin accounts can reset password via this portal."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Invalidate existing unused OTPs
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

        # Generate a 6-digit OTP
        otp_code = f"{random.randint(100000, 999999)}"
        PasswordResetOTP.objects.create(user=user, otp=otp_code)

        # Attempt to send SMTP email in a background thread to prevent request freeze
        import threading
        from apps.core.emails import send_lms_email
        
        subject = "Security Verification: Password Reset Request"
        message = (
            f"Dear Administrator,\n\n"
            f"We received a request to reset the password associated with your account. "
            f"Please use the verification code below to authorize this request. "
            f"This code will expire in 10 minutes.\n\n"
            f"Verification Code: {otp_code}\n\n"
            f"If you did not request this change, please ignore this email or reach out to support."
        )
        
        def _send_otp_task():
            # pyrefly: ignore [missing-import]
            from django.db import connections
            connections.close_all()
            try:
                send_lms_email(
                    to_email=email,
                    subject=subject,
                    text_body=message,
                    async_mode=False
                )
            except Exception as e:
                print(f"SMTP Error: {str(e)}")
                print(f"============================================================")
                print(f"PASSWORD RESET OTP FOR {email}: {otp_code}")
                print(f"============================================================")

        thread = threading.Thread(target=_send_otp_task, daemon=True)
        thread.start()

        AuditLog.objects.create(
            user=user,
            action=f"Requested password reset OTP (Dispatched to background thread)",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return response.Response(
            {"detail": "A verification code has been sent to your email."}, 
            status=status.HTTP_200_OK
        )

class RequestPasswordResetView(views.APIView, BaseRequestPasswordResetView):
    pass



class ResetPasswordView(views.APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password', '')

        if not email or not otp or not new_password:
            return response.Response(
                {"detail": "Email, OTP, and new password are required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 6:
            return response.Response(
                {"detail": "Password must be at least 6 characters long."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = CustomUser.objects.get(email=email, role='SUPER_ADMIN')
        except CustomUser.DoesNotExist:
            return response.Response(
                {"detail": "Invalid administrator request."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find the latest active OTP for this user
        latest_active_otp = PasswordResetOTP.objects.filter(user=user, is_used=False).order_by('-created_at').first()

        if not latest_active_otp or not latest_active_otp.is_valid() or latest_active_otp.otp != otp:
            if latest_active_otp and latest_active_otp.is_valid():
                latest_active_otp.increment_attempt()
                remaining = max(0, latest_active_otp.MAX_ATTEMPTS - latest_active_otp.attempt_count)
                if remaining == 0:
                    return response.Response(
                        {"detail": "Too many failed attempts. This code has expired. Please request a new one."}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            return response.Response(
                {"detail": "Invalid or expired verification code."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        latest_otp = latest_active_otp

        # Update password
        user.set_password(new_password)
        user.save()

        # Mark the OTP as used
        latest_otp.is_used = True
        latest_otp.save()

        AuditLog.objects.create(
            user=user,
            action="Successfully reset password via OTP verification.",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return response.Response(
            {"detail": "Password reset successfully. You can now log in with your new password."}, 
            status=status.HTTP_200_OK
        )

