from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import exceptions
from apps.users.models import CustomUser, StudentProfile
from django.utils import timezone

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Append role and user details to JWT payload
        token['email'] = user.email
        token['role'] = user.role
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        if user.role == 'STUDENT' and hasattr(user, 'student_profile'):
            token['categories'] = [c.name for c in user.student_profile.categories.all()]
        else:
            token['categories'] = []
        return token

    def validate(self, attrs):
        # Complete simplejwt standard validation first
        data = super().validate(attrs)
        
        user = self.user
        
        # Evaluate if the user is a student and check for course expiry
        if user.role == 'STUDENT':
            try:
                profile = user.student_profile
                if profile.end_date and profile.end_date <= timezone.now().date():
                    if user.is_active:
                        user.is_active = False
                        user.save()
                    raise exceptions.AuthenticationFailed(
                        "Your Course Access has Expired. Please contact Staff."
                    )
            except StudentProfile.DoesNotExist:
                pass

        # Handle deactivated accounts
        if not user.is_active:
            if user.role == 'STUDENT':
                raise exceptions.AuthenticationFailed(
                    "Your Course Access has Expired. Please contact Staff."
                )
            raise exceptions.AuthenticationFailed("This account is inactive. Please contact your administrator.")
        
        # Log login history details
        from apps.users.models import LoginHistory
        request = self.context.get('request')
        ip = None
        ua = None
        if request:
            ip = request.META.get('REMOTE_ADDR')
            ua = request.META.get('HTTP_USER_AGENT')
        LoginHistory.objects.create(user=self.user, ip_address=ip, user_agent=ua)
        
        categories_list = []
        if self.user.role == 'STUDENT' and hasattr(self.user, 'student_profile'):
            categories_list = [c.name for c in self.user.student_profile.categories.all()]

        # Append user metadata directly in the API response json
        data['user'] = {
            'email': self.user.email,
            'role': self.user.role,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'categories': categories_list
        }
        return data
