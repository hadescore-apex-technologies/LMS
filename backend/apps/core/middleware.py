# ============================================================
#  Copyright (c) 2026 HadesCore Technologies. All Rights Reserved.
#  APEX LMS - Proprietary & Confidential
#  Unauthorized use, copying, distribution, or modification
#  of this software is strictly prohibited.
# ============================================================

import time
import hashlib
import threading
from collections import defaultdict
from django.http import JsonResponse
from django.conf import settings

# -- In-memory rate-limit store
_rl_lock = threading.Lock()
_rl_buckets = defaultdict(lambda: {"hits": 0, "window_start": time.time()})

RL_MAX_REQUESTS = getattr(settings, "RATE_LIMIT_MAX_REQUESTS", 300)
RL_WINDOW_SECONDS = getattr(settings, "RATE_LIMIT_WINDOW_SECONDS", 60)
RL_EXEMPT_PREFIXES = ("/favicon", "/admin/", "/media/", "/__debug__/")


def _get_client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "0.0.0.0")


class SecurityMiddleware:
    """
    1. Per-IP sliding-window rate limiting
    2. Ownership + security response headers
    3. Server identity scrubbing
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path_info

        # Rate Limiting
        if not any(path.startswith(p) for p in RL_EXEMPT_PREFIXES):
            ip = _get_client_ip(request)
            now = time.time()

            with _rl_lock:
                bucket = _rl_buckets[ip]
                if now - bucket["window_start"] >= RL_WINDOW_SECONDS:
                    bucket["hits"] = 0
                    bucket["window_start"] = now
                bucket["hits"] += 1
                current_hits = bucket["hits"]

            if current_hits > RL_MAX_REQUESTS:
                return JsonResponse(
                    {"error": "Too many requests. Please slow down.", "code": "RATE_LIMITED"},
                    status=429,
                    headers={
                        "Retry-After": str(RL_WINDOW_SECONDS),
                        "X-RateLimit-Limit": str(RL_MAX_REQUESTS),
                        "X-RateLimit-Window": f"{RL_WINDOW_SECONDS}s",
                    },
                )

        response = self.get_response(request)

        # Remove server identity
        response.headers.pop("Server", None)
        response.headers.pop("X-Powered-By", None)

        # Ownership fingerprint
        _fp = hashlib.sha256(b"HadesCore-Apex-LMS-2026").hexdigest()[:16]
        response["X-Platform"] = "Apex-LMS"
        response["X-Owner"] = "HadesCore-Technologies"
        response["X-Fingerprint"] = _fp

        # Security headers
        response["X-Content-Type-Options"] = "nosniff"
        response["X-Frame-Options"] = "DENY"
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        )

        if request.is_secure():
            response["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        return response


class ObjectOwnershipMiddleware:
    """
    Guards every mutating API call (POST/PUT/PATCH/DELETE) to require
    a Bearer token even if a view forgets to declare permission_classes.
    """

    PUBLIC_WRITE_PREFIXES = (
        "/api/auth/",
        "/api/certificates/verify/",
        "/api/certificates/pdf/",
        "/favicon",
        "/media/",
        "/",
    )

    MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in self.MUTATING_METHODS:
            path = request.path_info
            is_public = any(path == p or path.startswith(p) for p in self.PUBLIC_WRITE_PREFIXES)

            if not is_public:
                auth_header = request.META.get("HTTP_AUTHORIZATION", "")
                if not auth_header.startswith("Bearer "):
                    return JsonResponse(
                        {"error": "Authentication credentials were not provided.", "code": "AUTH_REQUIRED"},
                        status=401,
                    )

        return self.get_response(request)
