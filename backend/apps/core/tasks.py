from celery import shared_task
from django.utils import timezone
from django.db import transaction
from apps.users.models import StudentProfile
from apps.core.models import AuditLog

@shared_task
def deactivate_expired_students():
    today = timezone.now().date()
    
    # Select all active student profiles that have reached or passed their end date
    expired_profiles = StudentProfile.objects.filter(
        end_date__lte=today,
        user__is_active=True
    ).select_related('user')

    count = 0
    with transaction.atomic():
        for profile in expired_profiles:
            user = profile.user
            user.is_active = False
            user.save()
            
            # Log deactivation action in the audit database
            AuditLog.objects.create(
                user=None,  # System-triggered action
                action=f"Auto-deactivated expired student profile for {user.email} (End Date was {profile.end_date})"
            )
            count += 1

    return f"Deactivated {count} expired students."
