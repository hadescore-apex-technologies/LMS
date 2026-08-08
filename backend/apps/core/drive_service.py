import os
# pyrefly: ignore [missing-import]
from django.conf import settings
from googleapiclient.discovery import build
from google.oauth2 import service_account
from googleapiclient.http import MediaFileUpload

SCOPES = ['https://www.googleapis.com/auth/drive']

# Look for credentials.json in the backend root directory
SERVICE_ACCOUNT_FILE = os.path.join(settings.BASE_DIR, 'credentials.json')

# Placeholder for user to insert their actual Folder ID
FOLDER_ID = '18FkHNeZjt8rzM_Oq2xNQwNpN7LPyTpkP'

def get_drive_service():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        raise FileNotFoundError(f"Missing {SERVICE_ACCOUNT_FILE}. Please place your Service Account credentials there.")
    
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        

    return build('drive', 'v3', credentials=creds)

def upload_file_to_drive(file_path, file_name):
    service = get_drive_service()

    file_metadata = {
        'name': file_name,
        'parents': [FOLDER_ID]
    }

    media = MediaFileUpload(file_path, resumable=True)

    file = service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id'
    ).execute()

    file_id = file.get('id')

    # Public access (optional)
    service.permissions().create(
        fileId=file_id,
        body={'type': 'anyone', 'role': 'reader'}
    ).execute()

    return f"https://drive.google.com/file/d/{file_id}/view"
