from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from apps.authentication.views import (
    CustomTokenObtainPairView, 
    RevokeAllSessionsView,
    RequestPasswordResetView,
    ResetPasswordView
)

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('revoke-all/', RevokeAllSessionsView.as_view(), name='revoke_all_sessions'),
    path('forgot-password/', RequestPasswordResetView.as_view(), name='forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
]
