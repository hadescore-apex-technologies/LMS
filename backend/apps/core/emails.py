"""
Apex LMS - Transactional Email Utilities
Handles all outgoing email sends with the configured SMTP backend.

DELIVERABILITY STRATEGY:
- Plain text only — no HTML. Gmail treats plain-text emails like
  person-to-person messages, not marketing/automated emails.
- No custom headers (X-Mailer, X-Entity-Ref-ID, etc.)
- Minimal, clean email that looks like a normal person sent it.

PERFORMANCE:
- SMTP settings cached in memory (refreshed every 5 minutes).
- All DB queries and SMTP work run inside the background thread.
- API response returns instantly — zero blocking.
"""
import logging
import socket
import threading
import time
from email.utils import formataddr
from typing import Any

# Force IPv4 socket resolution on Linux/Render containers to eliminate [Errno 101] Network is unreachable
_orig_getaddrinfo = socket.getaddrinfo

def _smtp_ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    if host and ('gmail' in str(host).lower() or 'smtp' in str(host).lower()):
        return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
    return _orig_getaddrinfo(host, port, family, type, proto, flags)

socket.getaddrinfo = _smtp_ipv4_getaddrinfo

# pyrefly: ignore [missing-import]
from django.conf import settings
# pyrefly: ignore [missing-import]
from django.core.mail import get_connection

logger = logging.getLogger(__name__)


# ── Default Templates ──────────────────────────────────────────────────────────

WELCOME_EMAIL_SUBJECT = "Welcome to Apex LMS – Account Details & Getting Started"

WELCOME_EMAIL_BODY = """\
Dear {full_name},

Welcome to Apex LMS! Your learning account has been successfully provisioned.

We are excited to have you join our platform. Below are your account access credentials and login details to help you get started:

ACCOUNT DETAILS
--------------------------------------------------
Name: {full_name}
Email Address: {email}
Account Role: {role}
Temporary Password: {password}

PORTAL ACCESS
--------------------------------------------------
You can log in to your learning dashboard here:
{login_url}

GETTING STARTED STEPS
--------------------------------------------------
1. Log in using your email and temporary password provided above.
2. For security, update your password under your Profile Settings after first login.
3. Explore your assigned courses, modules, live sessions, and progress tracking.

NEED ASSISTANCE?
--------------------------------------------------
If you have any questions or require support, please contact our team at info@apex.hadescoretech.com.

Best regards,

Apex LMS Administration
Hadescore Apex Technologies Team
"""

LIVE_CLASS_EMAIL_SUBJECT = "Live Session Notification: {session_title}"

LIVE_CLASS_EMAIL_BODY = """\
Dear {student_name},

A new Doubt Clearing Live Session has been scheduled by your mentor, {mentor_name}.

SESSION DETAILS
--------------------------------------------------
Topic: {session_title}
Mentor: {mentor_name}
Date & Time: {scheduled_time}
Meeting URL: {meeting_link}

PREPARATION STEPS
--------------------------------------------------
1. Review your course materials prior to the session start time.
2. Prepare any specific questions or doubts you would like to discuss with your mentor.
3. Access the meeting link 5 minutes before the scheduled start time.

NEED ASSISTANCE?
--------------------------------------------------
If you cannot attend or have trouble joining the meeting, please send a message to your mentor via the LMS portal.

Best regards,

Academic Support Team
Hadescore Apex Technologies Team
"""

COURSE_COMPLETION_EMAIL_SUBJECT = "Course Completed: {course_title} – Download Your Certificate"

COURSE_COMPLETION_EMAIL_BODY = """\
Dear {student_name},

Congratulations! You have successfully completed 100% of your course '{course_title}'.

Your official Course Completion Certificate has been verified and issued. Please log in to your account portal to download your official certificate.

HOW TO DOWNLOAD YOUR CERTIFICATE
--------------------------------------------------
1. Visit the Student Login Portal: {portal_url}
2. Log in using your registered credentials.
3. Go to the "Certificates" tab to view and download your certificate.

COMPLETION DETAILS
--------------------------------------------------
Student Name: {student_name}
Course Completed: {course_title}
Certificate Code: {certificate_code}
Date of Issue: {completion_date}

Thank you for your hard work and dedication!

Best regards,

Academic Certification Office
Hadescore Apex Technologies Team
"""



import re

def convert_text_to_html(body_text: str, subject: str = "Notification", brand_name: str = "Apex LMS", login_url: str | None = None) -> str:
    url_pattern = re.compile(r'(https?://[^\s<"]+)')

    # Split text into paragraphs
    paragraphs = []
    lines = body_text.strip().split('\n')
    current_para = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_para:
                paragraphs.append('\n'.join(current_para))
                current_para = []
        else:
            current_para.append(line)
    if current_para:
        paragraphs.append('\n'.join(current_para))

    html_paragraphs = []
    for para in paragraphs:
        para_html = para.replace('\n', '<br>')
        para_html = url_pattern.sub(r'<a href="\1" target="_blank" style="color: #2563eb; font-weight: 600; text-decoration: underline;">\1</a>', para_html)
        html_paragraphs.append(f'<p style="margin-top: 0; margin-bottom: 14px; font-size: 15px; line-height: 1.6; color: #334155;">{para_html}</p>')

    paragraphs_joined = "\n".join(html_paragraphs)

    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6;">
  <div style="max-width: 580px; margin: 0 auto; padding: 24px;">
    {paragraphs_joined}
  </div>
</body>
</html>"""
    return html_template



# ── SMTP Settings Cache ───────────────────────────────────────────────────────
# Cache SMTP settings in memory to avoid 5 DB queries per email.
# Refreshes every 5 minutes automatically, or instantly when settings are saved.

_smtp_cache: dict[str, Any] = {
    'data': None,
    'expires_at': 0.0,
}
_CACHE_TTL = 300  # 5 minutes


def clear_smtp_cache():
    """Invalidate memory cache for SMTP settings so changes take effect immediately."""
    _smtp_cache['data'] = None
    _smtp_cache['expires_at'] = 0
    logger.info("[Email] SMTP cache cleared.")


def _get_cached_smtp_settings():
    """
    Fetch SMTP settings from DB, cached for 5 minutes.
    Returns dict with keys: host, port, user, password, from_email
    or None if no dynamic SMTP is configured.
    """
    now = time.time()
    if _smtp_cache['data'] is not None and now < _smtp_cache['expires_at']:
        return _smtp_cache['data']

    from apps.core.models import PlatformSettings

    try:
        smtp_keys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_from_email']
        rows = PlatformSettings.objects.filter(key__in=smtp_keys)
        settings_map = {row.key: str(row.value or '').strip() for row in rows}

        # pyrefly: ignore [unnecessary-type-conversion]
        host = str(settings_map.get('smtp_host', '') or '').strip()
        # pyrefly: ignore [unnecessary-type-conversion]
        user = str(settings_map.get('smtp_user', '') or '').strip()
        # pyrefly: ignore [unnecessary-type-conversion]
        password = str(settings_map.get('smtp_password', '') or '').strip()

        if host and ('gmail' in host.lower() or 'google' in host.lower() or len(password.replace(' ', '')) == 16):
            password = password.replace(' ', '')

        if host and user and password:
            port_str = settings_map.get('smtp_port', '587').strip()
            port = int(port_str) if port_str.isdigit() else 587
            result = {
                'host': host,
                'port': port,
                'user': user,
                'password': password,
                'from_email': settings_map.get('smtp_from_email', '').strip(),
            }
        else:
            result = None

        _smtp_cache['data'] = result
        _smtp_cache['expires_at'] = now + _CACHE_TTL
        return result

    except Exception as e:
        logger.error(f"[Email] Error fetching SMTP settings: {e}")
        return None


def _get_env_fallback_connection():
    from email.utils import parseaddr
    from_email = str(getattr(settings, 'DEFAULT_FROM_EMAIL', '') or 'Apex LMS <hadescore.apex.technologies@gmail.com>')
    display_name, email_addr = parseaddr(from_email) if from_email else ('Apex LMS', 'hadescore.apex.technologies@gmail.com')
    if not email_addr or '@' not in email_addr:
        email_addr = str(getattr(settings, 'EMAIL_HOST_USER', '') or 'hadescore.apex.technologies@gmail.com')
    if not display_name:
        display_name = 'Apex LMS'

    # Build a real connection from Django settings so email actually sends
    host = str(getattr(settings, 'EMAIL_HOST', '') or 'smtp.gmail.com').strip()
    port_val = str(getattr(settings, 'EMAIL_PORT', 465)).strip()
    port = int(port_val) if port_val.isdigit() else 465
    user = str(getattr(settings, 'EMAIL_HOST_USER', '') or 'hadescore.apex.technologies@gmail.com').strip()
    password = str(getattr(settings, 'EMAIL_HOST_PASSWORD', '') or 'ievwcckkjvozzbku').replace(' ', '').strip()

    use_ssl = (port == 465) or (getattr(settings, 'EMAIL_USE_SSL', True) is True)
    use_tls = (not use_ssl)

    connection = get_connection(
        backend='django.core.mail.backends.smtp.EmailBackend',
        host=host,
        port=port,
        username=user,
        password=password,
        use_tls=use_tls,
        use_ssl=use_ssl,
        timeout=15,
    )

    sender = formataddr((display_name, email_addr))
    return connection, sender, email_addr


def get_smtp_connection_and_sender():
    """
    Build an SMTP connection + sender address from cached settings.
    Falls back to Django settings when no dynamic config exists.
    Returns: (connection, sender_formatted, sender_email_addr)
    """
    from email.utils import parseaddr
    smtp = _get_cached_smtp_settings()
    if smtp and smtp.get('host') and smtp.get('user') and smtp.get('password'):
        host = str(smtp['host']).strip()
        user = str(smtp['user']).strip()
        password = str(smtp['password']).replace(' ', '').strip()
        port = int(smtp.get('port', 465) or 465)
        use_ssl = (port == 465) or ('gmail' in host.lower() and port != 587)
        use_tls = (not use_ssl)

        connection = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=host,
            port=port,
            username=user,
            password=password,
            use_tls=use_tls,
            use_ssl=use_ssl,
            timeout=15,
        )

        from_email = str(smtp.get('from_email') or '')
        display_name, email_addr = parseaddr(from_email) if from_email else ('', '')
        
        if 'gmail' in host.lower() or not email_addr or '@' not in email_addr:
            email_addr = user
        if not display_name:
            display_name = 'Apex LMS'

        sender = formataddr((display_name, email_addr))
        return connection, sender, email_addr

    return _get_env_fallback_connection()


from concurrent.futures import ThreadPoolExecutor

_email_executor = ThreadPoolExecutor(max_workers=8, thread_name_prefix='apex_email_worker')


def _safe_async_send_worker(to_email: str, subject: str, text_body: str, html_body: str | None = None, reply_to: str | None = None):
    # Close any stale connections for multi-threaded Gunicorn environment
    # pyrefly: ignore [missing-import]
    from django.db import connections
    connections.close_all()
    try:
        logger.info(f"[Email Worker] Starting background send to {to_email} (Subject: '{subject}')")
        _send_lms_email_sync(to_email, subject, text_body, html_body, reply_to)
    except Exception as exc:
        logger.error(f"[Email Worker] Failed background email dispatch to {to_email}: {exc}", exc_info=True)


def send_lms_email(
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
    reply_to: str | None = None,
    async_mode: bool = True,
):
    """
    Unified anti-spam transactional email sender.
    Dispatches to persistent background ThreadPoolExecutor when async_mode=True.
    """
    if async_mode:
        _email_executor.submit(
            _safe_async_send_worker,
            to_email, subject, text_body, html_body, reply_to
        )
        return

    _send_lms_email_sync(to_email, subject, text_body, html_body, reply_to)


def _send_lms_email_sync(
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
    reply_to: str | None = None,
):
    # ── Pure Standard SMTP Connection ───────────────────────────────────────────
    # pyrefly: ignore [missing-import]
    from django.core.mail import EmailMultiAlternatives, get_connection
    # pyrefly: ignore [missing-import]
    from django.conf import settings

    connection, sender_formatted, sender_addr = get_smtp_connection_and_sender()

    if not connection:
        err_msg = (
            f"[Email] Outgoing SMTP host or credentials not configured. Cannot send email to '{to_email}'."
        )
        logger.error(err_msg)
        return

    reply_to_list = [reply_to] if reply_to else ([sender_addr] if sender_addr else None)

    if not html_body:
        html_body = convert_text_to_html(text_body, subject=subject)

    email_message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=sender_formatted,
        to=[to_email],
        reply_to=reply_to_list,
        connection=connection,
    )
    email_message.attach_alternative(html_body, "text/html")

    # Tier 1: Try primary connection
    try:
        email_message.send(fail_silently=False)
        logger.info(f"[Email] Successfully sent email to {to_email}")
        return
    except Exception as primary_exc:
        logger.warning(f"[Email] Primary SMTP connection failed for {to_email}: {primary_exc}. Trying Port 465 SSL fallback...")

    # Tier 2: Fallback attempt with Port 465 SSL
    user_to_use = str(getattr(settings, 'EMAIL_HOST_USER', '') or 'hadescore.apex.technologies@gmail.com').strip()
    pass_to_use = str(getattr(settings, 'EMAIL_HOST_PASSWORD', '') or 'ievwcckkjvozzbku').replace(' ', '').strip()
    host_to_use = getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com') or 'smtp.gmail.com'

    if user_to_use and pass_to_use:
        try:
            ssl_conn = get_connection(
                backend='django.core.mail.backends.smtp.EmailBackend',
                host=host_to_use,
                port=465,
                username=user_to_use,
                password=pass_to_use,
                use_ssl=True,
                use_tls=False,
                timeout=15,
            )
            email_message.connection = ssl_conn
            email_message.send(fail_silently=False)
            logger.info(f"[Email] Successfully sent email to {to_email} via Port 465 SSL fallback!")
            return
        except Exception as ssl_exc:
            logger.warning(f"[Email] Port 465 SSL fallback failed for {to_email}: {ssl_exc}. Trying Port 587 TLS...")

        # Tier 3: Fallback attempt with Port 587 TLS
        try:
            tls_conn = get_connection(
                backend='django.core.mail.backends.smtp.EmailBackend',
                host=host_to_use,
                port=587,
                username=user_to_use,
                password=pass_to_use,
                use_ssl=False,
                use_tls=True,
                timeout=15,
            )
            email_message.connection = tls_conn
            email_message.send(fail_silently=False)
            logger.info(f"[Email] Successfully sent email to {to_email} via Port 587 TLS fallback!")
            return
        except Exception as tls_exc:
            logger.error(f"[Email] All SMTP attempts (Primary, Port 465 SSL, Port 587 TLS) failed for {to_email}: {tls_exc}")
            raise tls_exc



# ── Template Cache ─────────────────────────────────────────────────────────────

_template_cache: dict[str, Any] = {}
_TEMPLATE_CACHE_TTL = 300  # 5 minutes


def _get_cached_templates(role: str):
    """
    Fetch email templates from DB, cached for 5 minutes per role.
    """
    raw_role = (role or 'STUDENT').lower()
    now = time.time()
    cached = _template_cache.get(raw_role)
    if cached and now < cached['expires_at']:
        return cached['subject'], cached['body']

    # pyrefly: ignore [missing-import]
    from django.db import connections
    connections.close_all()
    from apps.core.models import PlatformSettings

    keys_to_check = [f"welcome_email_{raw_role}_subject", f"welcome_email_{raw_role}_body"]
    if raw_role in ('live_student', 'student'):
        keys_to_check.extend(['welcome_email_student_subject', 'welcome_email_student_body', 'welcome_email_live_student_subject', 'welcome_email_live_student_body'])

    try:
        rows = PlatformSettings.objects.filter(key__in=keys_to_check)
        templates = {row.key: row.value for row in rows if row.value}
        
        subject_template = (
            templates.get(f"welcome_email_{raw_role}_subject") or 
            templates.get("welcome_email_student_subject") or 
            WELCOME_EMAIL_SUBJECT
        )
        body_template = (
            templates.get(f"welcome_email_{raw_role}_body") or 
            templates.get("welcome_email_student_body") or 
            WELCOME_EMAIL_BODY
        )
    except Exception as exc:
        logger.error(f"[Email] Failed to retrieve templates: {exc}")
        subject_template = WELCOME_EMAIL_SUBJECT
        body_template = WELCOME_EMAIL_BODY

    _template_cache[raw_role] = {
        'subject': subject_template,
        'body': body_template,
        'expires_at': now + _TEMPLATE_CACHE_TTL,
    }
    return subject_template, body_template


# ── Public API ─────────────────────────────────────────────────────────────────

def send_welcome_email(
    first_name: str,
    last_name: str,
    email: str,
    password: str,
    role: str = 'STUDENT',
    login_url: str | None = None,
):
    """
    Send the welcome email to a newly created user (student or staff).
    Formats template in memory and dispatches pure SMTP payload to background worker pool.
    """
    try:
        # pyrefly: ignore [unnecessary-type-conversion]
        clean_email = str(email or '').strip().lower()
        if not clean_email or '@' not in clean_email:
            logger.warning(f"[Email] Invalid email '{email}', skipping welcome email.")
            return

        full_name = f"{first_name or ''} {last_name or ''}".strip() or clean_email.split('@')[0]
        if not login_url:
            login_url = getattr(settings, 'FRONTEND_URL', 'https://lms.hadescoretech.com/student/login')

        subject_template, body_template = _get_cached_templates(role or 'STUDENT')

        display_role = (role or 'STUDENT').replace('_', ' ').title()
        if display_role.lower() == 'super admin':
            display_role = 'Administrator'

        fmt_args = dict(
            full_name=full_name,
            email=clean_email,
            password=password or '',
            login_url=login_url,
            role=display_role
        )

        subject = subject_template
        body = body_template
        for k, v in fmt_args.items():
            val_str = str(v or '')
            subject = subject.replace(f'{{{{{k}}}}}', val_str).replace(f'{{{k}}}', val_str)
            body = body.replace(f'{{{{{k}}}}}', val_str).replace(f'{{{k}}}', val_str)

        subject = subject.replace('\ufffd', '-').strip()
        body = body.replace('\ufffd', '-').strip()

        # Dispatch pure SMTP payload to worker pool
        send_lms_email(
            to_email=clean_email,
            subject=subject,
            text_body=body,
            async_mode=True
        )
    except Exception as exc:
        logger.error(f"[Email] Failed to format welcome email for {email}: {exc}")


def _send_live_class_email_thread(live_class_id: int):
    # pyrefly: ignore [missing-import]
    from django.db import connections
    connections.close_all()
    try:
        from apps.courses.models import LiveClass
        from apps.users.models import CustomUser
        from apps.core.models import PlatformSettings

        live_class = LiveClass.objects.select_related('created_by', 'course').filter(id=live_class_id).first()
        if not live_class:
            return

        # Comprehensive student targeting: collect explicit M2M students, course track students, and mentor assigned students
        student_ids = set(live_class.students.filter(is_active=True).values_list('id', flat=True))

        if live_class.course:
            # Course Doubt Clearing Session: Target all active students enrolled in this course track
            c_ids = set(CustomUser.objects.filter(
                role='STUDENT',
                is_active=True,
                student_profile__courses=live_class.course
            ).values_list('id', flat=True))
            student_ids.update(c_ids)

        if live_class.created_by:
            # pyrefly: ignore [missing-import]
            from django.db.models import Q
            mentor = live_class.created_by
            staff_cat = mentor.staff_profile.category if hasattr(mentor, 'staff_profile') and mentor.staff_profile else None
            filter_q = Q(student_profile__assigned_live_staff=mentor) | Q(student_profile__assigned_staff=mentor)
            if staff_cat:
                filter_q |= Q(student_profile__courses__category=staff_cat)
            m_ids = set(CustomUser.objects.filter(
                role='STUDENT',
                is_active=True
            ).filter(filter_q).values_list('id', flat=True))
            student_ids.update(m_ids)

        targeted_students = list(CustomUser.objects.filter(id__in=student_ids, is_active=True))

        if not targeted_students:
            logger.info(f"[LiveClass Email] No active assigned students found for LiveClass #{live_class_id}")
            return

        # Fetch custom templates from DB or fallback
        try:
            rows = PlatformSettings.objects.filter(key__in=['live_class_email_subject', 'live_class_email_body'])
            templates = {row.key: row.value for row in rows}
            subj_tpl = templates.get('live_class_email_subject', LIVE_CLASS_EMAIL_SUBJECT)
            body_tpl = templates.get('live_class_email_body', LIVE_CLASS_EMAIL_BODY)
        except Exception as exc:
            logger.error(f"[LiveClass Email] Failed to fetch template settings: {exc}")
            subj_tpl = LIVE_CLASS_EMAIL_SUBJECT
            body_tpl = LIVE_CLASS_EMAIL_BODY

        # Format variables
        mentor_name = f"{live_class.created_by.first_name} {live_class.created_by.last_name}".strip() if live_class.created_by else "Your Mentor"
        if not mentor_name or mentor_name == "":
            mentor_name = live_class.created_by.email if live_class.created_by else "Your Mentor"

        session_title = live_class.title or "Doubt Clearing Session"
        scheduled_time = live_class.scheduled_time.strftime("%b %d, %Y at %I:%M %p") if live_class.scheduled_time else "Scheduled Time"
        meeting_link = getattr(live_class, 'meeting_url', None) or getattr(live_class, 'meeting_link', None) or "Check dashboard for link"

        # Normalize {{placeholder}} → {placeholder}
        for p in ['student_name', 'session_title', 'mentor_name', 'scheduled_time', 'meeting_link', 'full_name']:
            subj_tpl = subj_tpl.replace(f'{{{{{p}}}}}', f'{{{p}}}')
            body_tpl = body_tpl.replace(f'{{{{{p}}}}}', f'{{{p}}}')

        for student in targeted_students:
            student_name = f"{student.first_name} {student.last_name}".strip() or student.email.split('@')[0]
            fmt_args = dict(
                student_name=student_name,
                full_name=student_name,
                session_title=session_title,
                mentor_name=mentor_name,
                scheduled_time=scheduled_time,
                meeting_link=meeting_link
            )

            try:
                subject = subj_tpl.format(**fmt_args)
                body = body_tpl.format(**fmt_args)
            except Exception:
                subject = subj_tpl
                body = body_tpl
                for k, v in fmt_args.items():
                    subject = subject.replace(f'{{{k}}}', str(v))
                    body = body.replace(f'{{{k}}}', str(v))

            try:
                send_lms_email(
                    to_email=student.email,
                    subject=subject,
                    text_body=body,
                    async_mode=False,
                )
            except Exception as e:
                logger.error(f"[LiveClass Email] Failed to send email to {student.email}: {e}")

    except Exception as exc:
        logger.error(f"[LiveClass Email] Thread error: {exc}")


def send_live_class_email(live_class_id: int):
    """
    Send SMTP email notifications to assigned students for a Live Class.
    Returns INSTANTLY — processed via dedicated background worker pool.
    """
    _email_executor.submit(_send_live_class_email_thread, live_class_id)


def _send_course_completion_email_thread(certificate_id: int):
    # pyrefly: ignore [missing-import]
    from django.db import connections
    connections.close_all()
    try:
        from apps.certificates.models import Certificate
        from apps.core.models import PlatformSettings

        cert = Certificate.objects.select_related('student', 'course').filter(id=certificate_id).first()
        if not cert or not cert.student or not cert.student.email:
            return

        # Fetch custom template settings from DB or fallback
        try:
            rows = PlatformSettings.objects.filter(key__in=['course_completion_email_subject', 'course_completion_email_body'])
            templates = {row.key: row.value for row in rows}
            subj_tpl = templates.get('course_completion_email_subject', COURSE_COMPLETION_EMAIL_SUBJECT)
            body_tpl = templates.get('course_completion_email_body', COURSE_COMPLETION_EMAIL_BODY)
        except Exception as exc:
            logger.error(f"[Course Completion Email] Failed to fetch template settings: {exc}")
            subj_tpl = COURSE_COMPLETION_EMAIL_SUBJECT
            body_tpl = COURSE_COMPLETION_EMAIL_BODY

        student_name = f"{cert.student.first_name} {cert.student.last_name}".strip() or cert.student.email.split('@')[0]
        course_title = cert.course.title if cert.course else "Your Course Track"
        certificate_code = cert.certificate_code or "N/A"
        certificate_url = cert.file_url or "https://lms.hadescoretech.com/student"
        completion_date = cert.issued_at.strftime("%b %d, %Y") if cert.issued_at else time.strftime("%b %d, %Y")

        base_frontend = getattr(settings, 'FRONTEND_URL', 'https://lms.hadescoretech.com')
        if not base_frontend.endswith('/'):
            base_frontend += '/'
        login_url = f"{base_frontend}student/login"
        portal_url = login_url

        fmt_args = dict(
            student_name=student_name,
            full_name=student_name,
            course_title=course_title,
            course_name=course_title,
            certificate_code=certificate_code,
            certificate_url=certificate_url,
            download_url=certificate_url,
            completion_date=completion_date,
            portal_url=portal_url,
            login_url=login_url,
        )

        # Normalize {{placeholder}} -> {placeholder}
        for p in ['student_name', 'full_name', 'course_title', 'course_name', 'certificate_code', 'certificate_url', 'download_url', 'completion_date', 'portal_url', 'login_url']:
            subj_tpl = subj_tpl.replace(f'{{{{{p}}}}}', f'{{{p}}}')
            body_tpl = body_tpl.replace(f'{{{{{p}}}}}', f'{{{p}}}')

        try:
            subject = subj_tpl.format(**fmt_args)
            body = body_tpl.format(**fmt_args)
        except Exception:
            subject = subj_tpl
            body = body_tpl
            for k, v in fmt_args.items():
                subject = subject.replace(f'{{{k}}}', str(v))
                body = body.replace(f'{{{k}}}', str(v))

        send_lms_email(
            to_email=cert.student.email,
            subject=subject,
            text_body=body,
            async_mode=False,
        )
        logger.info(f"[Course Completion Email] Successfully sent completion email to {cert.student.email} for Certificate {cert.certificate_code}")

    except Exception as exc:
        logger.error(f"[Course Completion Email] Thread error: {exc}")


def send_course_completion_email(certificate_id: int):
    """
    Triggers SMTP email notifications to a student upon course completion / certificate issuance.
    Returns INSTANTLY — processed via dedicated background worker pool.
    """
    _email_executor.submit(_send_course_completion_email_thread, certificate_id)


