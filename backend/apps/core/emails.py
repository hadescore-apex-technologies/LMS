"""
Apex LMS - Transactional Email Utilities
Handles all outgoing email sends with the configured SMTP backend.
"""
import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


WELCOME_EMAIL_SUBJECT = "Welcome to Apex LMS – Your Account Has Been Created"

WELCOME_EMAIL_BODY = """\
Dear {full_name},

Welcome to Apex LMS! 🎉

Your account has been successfully created. You can now log in to the Apex LMS portal using the credentials below.

--- Login Credentials ---

Name: {full_name}
Email: {email}
Temporary Password: {password}

Login Portal:
{login_url}

For security reasons, please change your password immediately after your first login.

Once you log in, you can:
- Access your assigned courses
- Watch video lessons
- Attend live classes
- Complete quizzes and assignments
- Track your learning progress
- Download certificates after successful course completion

If you experience any issues while logging in, please contact our support team.

Support Email: support@apex.com

Thank you for choosing Apex LMS. We wish you a successful learning journey.

Best Regards,
Apex LMS Team
"""


def send_welcome_email(first_name: str, last_name: str, email: str, password: str, login_url: str = None):
    """
    Send the welcome email to a newly created user (student or staff).
    
    Args:
        first_name: User's first name
        last_name:  User's last name
        email:      User's login email address
        password:   Plain-text temporary password to include in the email
        login_url:  Optional login portal URL (defaults to a placeholder)
    """
    if not login_url:
        login_url = getattr(settings, 'FRONTEND_URL', 'https://apex-lms.com/login')

    full_name = f"{first_name} {last_name}".strip() or email.split('@')[0]

    body = WELCOME_EMAIL_BODY.format(
        full_name=full_name,
        email=email,
        password=password,
        login_url=login_url,
    )

    try:
        send_mail(
            subject=WELCOME_EMAIL_SUBJECT,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f"[Email] Welcome email sent to: {email}")
    except Exception as exc:
        # Non-blocking: log the error but do not raise — account is already created
        logger.error(f"[Email] Failed to send welcome email to {email}: {exc}")
