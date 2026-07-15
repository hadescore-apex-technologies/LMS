from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from apps.authentication.views import CustomTokenObtainPairView, RevokeAllSessionsView

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('revoke-all/', RevokeAllSessionsView.as_view(), name='revoke_all_sessions'),
]
