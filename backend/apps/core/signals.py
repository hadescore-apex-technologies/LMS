import os
# pyrefly: ignore [missing-import]
from django.db.models.signals import pre_save, post_delete
# pyrefly: ignore [missing-import]
from django.dispatch import receiver
from apps.core.drive_service import extract_drive_file_id, delete_file_from_drive

# List of fields in any model that could potentially store file/video URLs
FILE_URL_FIELDS = [
    'thumbnail', 
    'pdf_ppt_url', 
    'zip_source_url', 
    'file_attachment', 
    'file_submission', 
    'file_url', 
    'profile_photo',
    'banner'
]

@receiver(post_delete)
def auto_delete_file_on_delete(sender, instance, **kwargs):
    """
    Deletes corresponding files from Google Drive when a database record is deleted.
    """
    # Iterate through all fields of the deleted model instance
    for field in instance._meta.fields:
        field_name = field.name
        # Check if this field might contain a file URL
        if field_name in FILE_URL_FIELDS:
            url = getattr(instance, field_name, None)
            if url and isinstance(url, str):
                file_id = extract_drive_file_id(url)
                if file_id:
                    delete_file_from_drive(file_id)

@receiver(pre_save)
def auto_delete_file_on_change(sender, instance, **kwargs):
    """
    Deletes old files from Google Drive when a file field is updated/replaced.
    """
    # If it is a new instance, there is no old file to delete
    if not instance.pk:
        return

    try:
        # Fetch the old instance from the database
        old_instance = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    # Iterate through all fields of the model
    for field in instance._meta.fields:
        field_name = field.name
        if field_name in FILE_URL_FIELDS:
            old_url = getattr(old_instance, field_name, None)
            new_url = getattr(instance, field_name, None)
            
            # If the URL changed or was cleared, delete the old file
            if old_url and old_url != new_url and isinstance(old_url, str):
                file_id = extract_drive_file_id(old_url)
                if file_id:
                    delete_file_from_drive(file_id)
