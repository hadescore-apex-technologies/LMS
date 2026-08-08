import time
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from apps.core.models import PlatformSettings

_REVOCATION_CACHE = {'val': None, 'ts': 0}

class CustomJWTAuthentication(JWTAuthentication):
    def get_validated_token(self, raw_token):
        validated_token = super().get_validated_token(raw_token)
        
        try:
            now = time.time()
            if now - _REVOCATION_CACHE['ts'] > 15:
                revocation_setting = PlatformSettings.objects.filter(key='jwt_invalidated_at').first()
                _REVOCATION_CACHE['val'] = float(revocation_setting.value) if revocation_setting else None
                _REVOCATION_CACHE['ts'] = now
                
            revocation_time = _REVOCATION_CACHE['val']
            if revocation_time:
                iat = validated_token.get('iat')
                if iat and iat < revocation_time:
                    raise InvalidToken("Session has been revoked by platform administrator.")
        except InvalidToken as e:
            print("INVALID TOKEN EXCEPTION:", e)
            raise
        except Exception as e:
            print("EXCEPTION IN AUTH:", e)
            pass
            
        return validated_token

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if user and user.role == 'STUDENT' and hasattr(user, 'student_profile'):
            from django.utils import timezone
            profile = user.student_profile
            today = timezone.now().date()
            if profile.end_date:
                if profile.end_date < today:
                    if user.is_active:
                        user.is_active = False
                        user.save(update_fields=['is_active'])
                    raise InvalidToken(f"Your Course Access has Expired (allotted {profile.course_duration} days ended on {profile.end_date}). Please contact staff.")
                else:
                    if not user.is_active:
                        user.is_active = True
                        user.save(update_fields=['is_active'])
            else:
                if not user.is_active:
                    user.is_active = True
                    user.save(update_fields=['is_active'])
        return user
