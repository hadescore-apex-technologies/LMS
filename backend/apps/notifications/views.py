# pyrefly: ignore [missing-import]
from rest_framework import viewsets, status, response, decorators
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated
from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()[:40]
        serializer = self.get_serializer(queryset, many=True)
        return response.Response(serializer.data)

    def perform_create(self, serializer):
        # Allow programmatic scheduling of notification
        serializer.save(recipient=self.request.user)

    @decorators.action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return response.Response({"status": "notification marked as read"})

    @decorators.action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return response.Response({"status": "all notifications marked as read"})

    @decorators.action(detail=False, methods=['delete'], url_path='clear-all')
    def clear_all(self, request):
        """Delete all notifications for the current user."""
        count, _ = Notification.objects.filter(recipient=request.user).delete()
        return response.Response({"status": f"{count} notifications cleared"}, status=status.HTTP_200_OK)
