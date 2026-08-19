import os
from pathlib import Path
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env file using python-dotenv with override=True
try:
    # pyrefly: ignore [missing-import]
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=BASE_DIR / '.env', override=True)
except Exception:
    pass


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-apex-lms-super-secret-key-102938')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party packages
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',

    # Custom LMS Apps
    'apps.core',
    'apps.authentication',
    'apps.users',
    'apps.students',
    'apps.staff',
    'apps.categories',
    'apps.courses',
    'apps.modules',
    'apps.lessons',
    'apps.videos',
    'apps.quizzes',
    'apps.assignments',
    'apps.certificates',
    'apps.notifications',
    'apps.analytics',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # ── HadesCore Apex LMS Protection Layer ─────────────────
    'apps.core.middleware.SecurityMiddleware',          # Rate limiting + headers
    'apps.core.middleware.ObjectOwnershipMiddleware',   # Unauthenticated write guard
    # ────────────────────────────────────────────────────────
    'django.middleware.gzip.GZipMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'apps.core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'apps.core.wsgi.application'
ASGI_APPLICATION = 'apps.core.asgi.application'

# Database Configuration - Supabase PostgreSQL Only
import urllib.parse

import sys

DATABASE_URL = os.environ.get('DATABASE_URL')
if 'test' in sys.argv:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
elif DATABASE_URL:
    db_url = urllib.parse.urlparse(DATABASE_URL)
    raw_pass = db_url.password
    db_pass = urllib.parse.unquote(raw_pass) if raw_pass else os.environ.get('SUPABASE_DB_PASSWORD', '@Hadescore.com')
    db_host = db_url.hostname or 'aws-0-ap-northeast-1.pooler.supabase.com'
    if db_host and db_host.startswith('@'):
        db_host = 'aws-0-ap-northeast-1.pooler.supabase.com'
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': db_url.path[1:] or 'postgres',
            'USER': db_url.username or 'postgres.scltqowxstewytlvixtw',
            'PASSWORD': db_pass,
            'HOST': db_host,
            'PORT': db_url.port or 6543,
            'CONN_MAX_AGE': 300,
            'CONN_HEALTH_CHECKS': True,
        }
    }
else:
    db_password = os.environ.get('SUPABASE_DB_PASSWORD', '@Hadescore.com')
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': 'postgres',
            'USER': 'postgres.scltqowxstewytlvixtw',
            'PASSWORD': db_password,
            'HOST': 'aws-0-ap-northeast-1.pooler.supabase.com',
            'PORT': 6543,
            'CONN_MAX_AGE': 300,
            'CONN_HEALTH_CHECKS': True,
        }
    }

# In-Memory Cache for ultra-low latency metadata & static responses
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'apex-lms-cache',
        'TIMEOUT': 300,
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Email / SMTP Configuration ─────────────────────────────────────────────────
# These are read from .env and serve as fallback when System Settings (PlatformSettings) are unconfigured.
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com').strip()
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').strip() == 'True'
EMAIL_USE_SSL = os.environ.get('EMAIL_USE_SSL', 'False').strip() == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '').strip()
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '').replace(' ', '').strip()
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', f'Apex LMS <{EMAIL_HOST_USER}>').strip()
SERVER_EMAIL = EMAIL_HOST_USER
EMAIL_TIMEOUT = 15

# Brevo HTTP API Email configuration (For Free Render tier port 443 compatibility)
BREVO_API_KEY = os.environ.get('BREVO_API_KEY', '').strip()


# Custom User Model
AUTH_USER_MODEL = 'users.CustomUser'

# Django REST Framework Configuration with Anti-Brute Force Throttling
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.authentication.auth_backend.CustomJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '120/minute',
        'user': '1000/minute',
    }
}

# Security Headers & Anti-Hacking Protections
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'SAMEORIGIN'

# SimpleJWT Settings - Permanent Non-Expiring Tokens for Staff & Admin (100 Years)
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=365 * 100),   # 100 Years - Access Token Never Expires
    'REFRESH_TOKEN_LIFETIME': timedelta(days=365 * 100),  # 100 Years - Refresh Token Never Expires
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# pyrefly: ignore [missing-import]
from corsheaders.defaults import default_headers, default_methods

# ── CORS & CSRF Configuration ──────────────────────────────
# Allow all origins if explicitly set via env var
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'False').lower() in ('true', '1', 'yes')

# Whitelist of allowed origins
_default_cors_origins = [
    # Production Domains
    "https://lms.hadescoretech.com",
    "https://www.lms.hadescoretech.com",
    "https://hadescoretech.com",
    "https://www.hadescoretech.com",
    "https://apex-lms.hadescore.com",
    "https://www.apex-lms.hadescore.com",
    "https://lms-nv6s.onrender.com",
    # Local development
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

_env_cors = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if _env_cors:
    _default_cors_origins.extend([o.strip() for o in _env_cors.split(',') if o.strip()])

CORS_ALLOWED_ORIGINS = list(dict.fromkeys(_default_cors_origins))

CORS_ALLOWED_ORIGIN_REGEXES = [
    # Allow any subdomain on hadescoretech.com and hadescore.com
    r"^https://([a-zA-Z0-9-]+\.)*hadescoretech\.com$",
    r"^https://([a-zA-Z0-9-]+\.)*hadescore\.com$",
    r"^https://([a-zA-Z0-9-]+\.)*vercel\.app$",
    r"^https://([a-zA-Z0-9-]+\.)*onrender\.com$",
    # Allow LAN device on the local network during development
    r"^http://192\.168\.[0-9]+\.[0-9]+(:[0-9]+)?$",
    r"^http://10\.[0-9]+\.[0-9]+\.[0-9]+(:[0-9]+)?$",
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + [
    'authorization',
    'content-type',
    'x-csrftoken',
    'x-requested-with',
    'accept',
    'origin',
    'user-agent',
    'dnt',
    'cache-control',
    'x-mx-reqtoken',
    'keep-alive',
    'if-modified-since',
]
CORS_ALLOW_METHODS = list(default_methods)

# CSRF Trusted Origins for Django 4+ / 5+
CSRF_TRUSTED_ORIGINS = [
    "https://lms.hadescoretech.com",
    "https://www.lms.hadescoretech.com",
    "https://hadescoretech.com",
    "https://www.hadescoretech.com",
    "https://apex-lms.hadescore.com",
    "https://www.apex-lms.hadescore.com",
    "https://lms-nv6s.onrender.com",
]
_env_csrf = os.environ.get('CSRF_TRUSTED_ORIGINS', '')
if _env_csrf:
    CSRF_TRUSTED_ORIGINS.extend([o.strip() for o in _env_csrf.split(',') if o.strip()])
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(CSRF_TRUSTED_ORIGINS))

# ── Rate Limiting Tuning ────────────────────────────────────
RATE_LIMIT_MAX_REQUESTS = 300   # Max requests per IP per window
RATE_LIMIT_WINDOW_SECONDS = 60  # Sliding window duration (seconds)

# ── Django Security Hardening ───────────────────────────────
# Redirect HTTP → HTTPS in production (set True via env for deploy)
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False') == 'True'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_BROWSER_XSS_FILTER = True

# Cookie security — True in production (HTTPS), False in dev
_is_prod = os.environ.get('SECURE_SSL_REDIRECT', 'False') == 'True'
SESSION_COOKIE_SECURE = _is_prod
CSRF_COOKIE_SECURE    = _is_prod
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY  = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE  = 'Lax'



# Celery & Redis Settings
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

CELERY_BEAT_SCHEDULE = {
    'deactivate-expired-students-daily': {
        'task': 'apps.core.tasks.deactivate_expired_students',
        'schedule': 86400.0,  # Run daily
    },
}

# Cloudflare configurations (R2 & Stream)
CLOUDFLARE_R2_BUCKET = os.environ.get('CF_R2_BUCKET', 'hadescore-apex-lms-storage')
CLOUDFLARE_R2_ACCESS_KEY = os.environ.get('CF_R2_ACCESS_KEY', '')
CLOUDFLARE_R2_SECRET_KEY = os.environ.get('CF_R2_SECRET_KEY', '')
CLOUDFLARE_R2_ENDPOINT_URL = os.environ.get('CF_R2_ENDPOINT_URL', '')

CLOUDFLARE_STREAM_ACCOUNT_ID = os.environ.get('CF_STREAM_ACCOUNT_ID', '')
CLOUDFLARE_STREAM_API_TOKEN = os.environ.get('CF_STREAM_API_TOKEN', '')

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Large file & video upload configurations (up to 5GB)
DATA_UPLOAD_MAX_MEMORY_SIZE = 5368709120  # 5 GB
FILE_UPLOAD_MAX_MEMORY_SIZE = 5368709120  # 5 GB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 10000
FILE_UPLOAD_PERMISSIONS = 0o644


