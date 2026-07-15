from django.urls import path
from apps.analytics.views import DashboardStatsView

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
]
