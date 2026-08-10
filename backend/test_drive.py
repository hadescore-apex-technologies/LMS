import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'apps.core.settings')
# pyrefly: ignore [missing-import]
import django
django.setup()

from apps.core.drive_service import get_drive_service, upload_file_to_drive

# Create a small temp file to test upload
temp_filename = "test_upload_status.txt"
with open(temp_filename, "w") as f:
    f.write("Testing Google Drive upload redirection to shared folder.")

try:
    print("Testing upload to shared folder using GOOGLE_DRIVE_FOLDER_ID...")
    # Get absolute path
    abs_path = os.path.abspath(temp_filename)
    url = upload_file_to_drive(abs_path, temp_filename)
    print(f"SUCCESS! Uploaded file URL is: {url}")
except Exception as e:
    print(f"ERROR OCCURRED: {e}")
finally:
    if os.path.exists(temp_filename):
        os.remove(temp_filename)
