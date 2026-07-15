from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from apps.core.models import PlatformSettings

class CustomJWTAuthentication(JWTAuthentication):
    def get_validated_token(self, raw_token):
        validated_token = super().get_validated_token(raw_token)
        
        try:
            revocation_setting = PlatformSettings.objects.filter(key='jwt_invalidated_at').first()
            if revocation_setting:
                revocation_time = float(revocation_setting.value)
                iat = validated_token.get('iat')
                if iat and iat < revocation_time:
                    raise InvalidToken("Session has been revoked by platform administrator.")
        except InvalidToken:
            raise
        except Exception:
            pass
            
        return validated_token
