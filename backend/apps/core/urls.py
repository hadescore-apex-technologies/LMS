from django.contrib import admin
from django.urls import path, include

from django.http import HttpResponse

def favicon_view(request):
    return HttpResponse(status=204)

urlpatterns = [
    path('favicon.ico', favicon_view),
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/auth/', include('apps.authentication.urls')),
    path('api/users/', include('apps.users.urls')),
    path('api/students/', include('apps.students.urls')),
    path('api/categories/', include('apps.categories.urls')),
    path('api/courses/', include('apps.courses.urls')),
    path('api/modules/', include('apps.modules.urls')),
    path('api/lessons/', include('apps.lessons.urls')),
    path('api/quizzes/', include('apps.quizzes.urls')),
    path('api/assignments/', include('apps.assignments.urls')),
    path('api/certificates/', include('apps.certificates.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/core/', include('apps.core.api_urls')),
    path('api/videos/', include('apps.videos.urls')),
]

from django.conf import settings
from django.conf.urls.static import static
from django.urls import re_path
from django.views.static import serve

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

