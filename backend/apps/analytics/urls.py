# pyrefly: ignore [missing-import]
from django.urls import path
from apps.analytics.views import DashboardStatsView, MentorAssignmentsView, AdminReportsView, BroadcastAnnouncementView

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('mentor-assignments/', MentorAssignmentsView.as_view(), name='mentor-assignments'),
    path('reports/', AdminReportsView.as_view(), name='admin-reports'),
    path('broadcast/', BroadcastAnnouncementView.as_view(), name='broadcast-announcement'),
]
