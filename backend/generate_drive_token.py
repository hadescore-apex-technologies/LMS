import os
import sys
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests

SCOPES = 'https://www.googleapis.com/auth/drive'
auth_code = None

class OAuthCallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        parsed_url = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed_url.query)

        if 'code' in params:
            auth_code = params['code'][0]
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            html = """
            <html>
            <body style="font-family: system-ui; text-align: center; padding-top: 50px; background: #0f172a; color: #38bdf8;">
                <h1 style="color: #4ade80;">Google Drive Authorization Successful!</h1>
                <p style="font-size: 18px; color: #94a3b8;">Your new refresh token has been generated and automatically saved to <b>backend/.env</b>.</p>
                <p style="color: #64748b;">You can close this browser tab now.</p>
            </body>
            </html>
            """
            self.wfile.write(html.encode('utf-8'))
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Authorization code not found in request.")

    def log_message(self, format, *args):
        return  # Silence standard HTTP logs

def main():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    client_id = os.environ.get('GOOGLE_DRIVE_CLIENT_ID')
    client_secret = os.environ.get('GOOGLE_DRIVE_CLIENT_SECRET')

    if (not client_id or not client_secret) and os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                if line.startswith('GOOGLE_DRIVE_CLIENT_ID='):
                    client_id = line.strip().split('=', 1)[1].strip()
                elif line.startswith('GOOGLE_DRIVE_CLIENT_SECRET='):
                    client_secret = line.strip().split('=', 1)[1].strip()

    if not client_id or not client_secret:
        print("ERROR: GOOGLE_DRIVE_CLIENT_ID or GOOGLE_DRIVE_CLIENT_SECRET missing in backend/.env", flush=True)
        return

    redirect_uri = "http://localhost:8080/"
    auth_params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': SCOPES,
        'access_type': 'offline',
        'prompt': 'consent'
    }
    auth_url = f"https://accounts.google.com/o/oauth2/auth?{urllib.parse.urlencode(auth_params)}"

    print("\n" + "="*70, flush=True)
    print("STEP 1: Open the link below in your browser:", flush=True)
    print("="*70, flush=True)
    print(auth_url, flush=True)
    print("="*70, flush=True)
    print("\nWaiting for authorization on http://localhost:8080/ ...", flush=True)

    server = HTTPServer(('localhost', 8080), OAuthCallbackHandler)
    server.handle_request()  # Handle single OAuth callback request

    if not auth_code:
        print("\nERROR: No authorization code received.", flush=True)
        return

    print("\n[OK] Received authorization code. Exchanging for Refresh Token...", flush=True)
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'code': auth_code,
        'grant_type': 'authorization_code',
        'redirect_uri': redirect_uri
    }

    res = requests.post(token_url, data=token_data)
    token_json = res.json()
    refresh_token = token_json.get('refresh_token')

    if not refresh_token:
        print("\nERROR: Failed to obtain refresh token from Google.", flush=True)
        print("Response:", token_json, flush=True)
        return

    print("\n" + "="*70, flush=True)
    print("SUCCESS! Your New Permanent Refresh Token:", flush=True)
    print(f"GOOGLE_DRIVE_REFRESH_TOKEN={refresh_token}", flush=True)
    print("="*70, flush=True)

    if os.path.exists(env_path):
        lines = []
        updated = False
        with open(env_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                if line.startswith('GOOGLE_DRIVE_REFRESH_TOKEN='):
                    lines.append(f"GOOGLE_DRIVE_REFRESH_TOKEN={refresh_token}\n")
                    updated = True
                else:
                    lines.append(line)
        if not updated:
            lines.append(f"GOOGLE_DRIVE_REFRESH_TOKEN={refresh_token}\n")

        with open(env_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print("\n[SUCCESS] Automatically updated backend/.env with the new refresh token!", flush=True)

if __name__ == '__main__':
    main()
