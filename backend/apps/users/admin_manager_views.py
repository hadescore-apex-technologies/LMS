from rest_framework import views, response, status
from rest_framework.permissions import IsAuthenticated
from apps.users.models import CustomUser
from apps.core.models import AuditLog

ROOT_EMAIL = 'hadescore.apex.technologies@gmail.com'


def is_root(user):
    return user.is_authenticated and user.role == 'SUPER_ADMIN' and user.email == ROOT_EMAIL


class AdminManagerView(views.APIView):
    """
    Root-only endpoint to list, create, and delete SUPER_ADMIN accounts.
    Only the root admin (hadescore.apex.technologies@gmail.com) can access this.
    """
    permission_classes = [IsAuthenticated]

    def _check_root(self, request):
        if not is_root(request.user):
            return response.Response(
                {"error": "Only the root administrator can access this endpoint."},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def get(self, request):
        err = self._check_root(request)
        if err:
            return err

        admins = CustomUser.objects.filter(role='SUPER_ADMIN').order_by('date_joined')
        data = [{
            "id": a.id,
            "email": a.email,
            "first_name": a.first_name,
            "last_name": a.last_name,
            "is_active": a.is_active,
            "date_joined": a.date_joined,
            "is_root": a.email == ROOT_EMAIL,
        } for a in admins]
        return response.Response(data)

    def post(self, request):
        err = self._check_root(request)
        if err:
            return err

        email = request.data.get('email', '').strip().lower()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        password = request.data.get('password', '').strip() or 'apex@admin123'

        if not email or '@' not in email:
            return response.Response({"error": "A valid email is required."}, status=status.HTTP_400_BAD_REQUEST)

        if CustomUser.objects.filter(email=email).exists():
            return response.Response({"error": "An account with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)

        admin = CustomUser(
            email=email,
            first_name=first_name,
            last_name=last_name,
            role='SUPER_ADMIN',
            is_staff=True,
        )
        admin.set_password(password)
        admin.save()

        AuditLog.objects.create(
            user=request.user,
            action=f"Root created new Admin account: {email}",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        # Send welcome email
        try:
            from apps.core.emails import send_welcome_email
            send_welcome_email(
                first_name=first_name,
                last_name=last_name,
                email=email,
                password=password,
                role='SUPER_ADMIN',
            )
        except Exception:
            pass

        return response.Response({
            "id": admin.id,
            "email": admin.email,
            "first_name": admin.first_name,
            "last_name": admin.last_name,
            "is_active": admin.is_active,
            "date_joined": admin.date_joined,
            "is_root": False,
        }, status=status.HTTP_201_CREATED)

    def delete(self, request):
        err = self._check_root(request)
        if err:
            return err

        admin_id = request.data.get('id')
        if not admin_id:
            return response.Response({"error": "Admin id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            admin = CustomUser.objects.get(id=admin_id, role='SUPER_ADMIN')
        except CustomUser.DoesNotExist:
            return response.Response({"error": "Admin not found."}, status=status.HTTP_404_NOT_FOUND)

        if admin.email == ROOT_EMAIL:
            return response.Response({"error": "The root account cannot be deleted."}, status=status.HTTP_403_FORBIDDEN)

        email = admin.email
        admin.delete()
        AuditLog.objects.create(
            user=request.user,
            action=f"Root deleted Admin account: {email}",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return response.Response({"message": f"Admin {email} deleted."})

    def patch(self, request):
        """Toggle is_active for an admin account."""
        err = self._check_root(request)
        if err:
            return err

        admin_id = request.data.get('id')
        try:
            admin = CustomUser.objects.get(id=admin_id, role='SUPER_ADMIN')
        except CustomUser.DoesNotExist:
            return response.Response({"error": "Admin not found."}, status=status.HTTP_404_NOT_FOUND)

        if admin.email == ROOT_EMAIL:
            return response.Response({"error": "Cannot modify the root account."}, status=status.HTTP_403_FORBIDDEN)

        admin.is_active = not admin.is_active
        admin.save()

        AuditLog.objects.create(
            user=request.user,
            action=f"Root {'activated' if admin.is_active else 'deactivated'} Admin: {admin.email}",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return response.Response({"is_active": admin.is_active})

    def put(self, request):
        """Reset password for a sub-admin account."""
        err = self._check_root(request)
        if err:
            return err

        admin_id = request.data.get('id')
        new_password = request.data.get('password', '').strip()

        if not new_password:
            return response.Response({"error": "New password is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            admin = CustomUser.objects.get(id=admin_id, role='SUPER_ADMIN')
        except CustomUser.DoesNotExist:
            return response.Response({"error": "Admin not found."}, status=status.HTTP_404_NOT_FOUND)

        admin.set_password(new_password)
        admin.save()

        AuditLog.objects.create(
            user=request.user,
            action=f"Root reset password for Admin: {admin.email}",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return response.Response({"message": f"Password updated for {admin.email}."})
