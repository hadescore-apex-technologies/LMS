import os
import re
# pyrefly: ignore [missing-import]
from django.conf import settings
from googleapiclient.discovery import build
from google.oauth2 import service_account
from googleapiclient.http import MediaFileUpload

SCOPES = ['https://www.googleapis.com/auth/drive']

# Look for credentials.json in the backend root directory
SERVICE_ACCOUNT_FILE = os.path.join(settings.BASE_DIR, 'credentials.json')

from google.oauth2.credentials import Credentials as OAuthCredentials

def has_drive_credentials():
    """Check if either OAuth env variables or credentials.json is present."""
    oauth_configured = (
        os.environ.get('GOOGLE_DRIVE_REFRESH_TOKEN') and
        os.environ.get('GOOGLE_DRIVE_CLIENT_ID') and
        os.environ.get('GOOGLE_DRIVE_CLIENT_SECRET')
    )
    return oauth_configured or os.path.exists(SERVICE_ACCOUNT_FILE)

def get_drive_service():
    if not has_drive_credentials():
        raise FileNotFoundError("Missing Google Drive credentials. Please configure OAuth environment variables or credentials.json.")
    
    # Prioritize OAuth credentials to avoid Service Account quota issues
    refresh_token = os.environ.get('GOOGLE_DRIVE_REFRESH_TOKEN')
    client_id = os.environ.get('GOOGLE_DRIVE_CLIENT_ID')
    client_secret = os.environ.get('GOOGLE_DRIVE_CLIENT_SECRET')
    
    if refresh_token and client_id and client_secret:
        creds = OAuthCredentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret
        )
    else:
        # Fallback to Service Account
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES)

    return build('drive', 'v3', credentials=creds)

def get_or_create_folder(service, folder_name="LMS_STORAGE"):
    """Find a folder by name or create it if not found."""
    query = f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    response = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
    files = response.get('files', [])
    
    if files:
        return files[0].get('id')
    
    # Folder not found, create it
    file_metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    folder = service.files().create(body=file_metadata, fields='id').execute()
    folder_id = folder.get('id')
    
    # Grant read access to anyone (so stored files can be publicly shared)
    try:
        service.permissions().create(
            fileId=folder_id,
            body={'type': 'anyone', 'role': 'reader'}
        ).execute()
    except Exception:
        pass
        
    return folder_id

def upload_file_to_drive(file_path, file_name):
    service = get_drive_service()
    
    # Use exact folder ID if configured in env, otherwise fallback to finding/creating
    folder_id = os.environ.get('GOOGLE_DRIVE_FOLDER_ID')
    if not folder_id:
        folder_id = get_or_create_folder(service, "LMS_STORAGE")

    file_metadata = {
        'name': file_name,
        'parents': [folder_id]
    }

    # Use non-resumable upload for faster small files, and 10MB chunks for large videos
    file_size = os.path.getsize(file_path)
    resumable = file_size > 5 * 1024 * 1024  # Only use resumable for files > 5MB
    chunksize = 10 * 1024 * 1024 if file_size > 10 * 1024 * 1024 else 2 * 1024 * 1024
    
    media = MediaFileUpload(file_path, resumable=resumable, chunksize=chunksize)

    try:
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()
    except Exception as e:
        print(f"Google Drive upload failed: {e}")
        raise

    file_id = file.get('id')

    # Grant read access to the uploaded file specifically (skip if fails)
    try:
        service.permissions().create(
            fileId=file_id,
            body={'type': 'anyone', 'role': 'reader'}
        ).execute()
    except Exception as e:
        print(f"Failed to set permissions for Drive file {file_id}: {e}")
        # Continue anyway - file is uploaded even if permissions fail

    return f"https://drive.google.com/file/d/{file_id}/view"

def delete_file_from_drive(file_id):
    """Delete a file from Google Drive using its file ID."""
    if not has_drive_credentials():
        return False
    try:
        service = get_drive_service()
        service.files().delete(fileId=file_id).execute()
        return True
    except Exception as e:
        print(f"Error deleting file {file_id} from Google Drive: {e}")
        return False

def extract_drive_file_id(url):
    """Extract Google Drive file ID from a URL."""
    if not url:
        return None
    match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', url)
    if match:
        return match.group(1)
    match_id = re.search(r'[?&]id=([a-zA-Z0-9_-]+)', url)
    if match_id:
        return match_id.group(1)
    return None
