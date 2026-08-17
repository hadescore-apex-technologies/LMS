from rest_framework import serializers
from apps.users.models import CustomUser, StaffProfile
from apps.categories.models import Category

class SafePrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    def to_internal_value(self, data):
        if data in (None, '', 'null', 0, '0'):
            return None
        try:
            return super().to_internal_value(data)
        except Exception:
            return None

class StaffUserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    category = SafePrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
        source='staff_profile.category'
    )
    category_name = serializers.CharField(source='staff_profile.category.name', read_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined', 'password', 'category', 'category_name']
        read_only_fields = ['id', 'date_joined', 'category_name']

    def validate_email(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Email address is required.")
        email = str(value).strip().lower()
        if '@' not in email:
            raise serializers.ValidationError("Please enter a valid email address.")
        return email

    def create(self, validated_data):
        profile_data = validated_data.pop('staff_profile', {})
        raw_pwd = validated_data.pop('password', None)
        password = raw_pwd.strip() if (raw_pwd and isinstance(raw_pwd, str) and raw_pwd.strip()) else 'apex123'
        role = validated_data.pop('role', 'STAFF')
        user = CustomUser(**validated_data)
        user.role = role
        user.set_password(password)
        user.save()

        # Create or update StaffProfile
        StaffProfile.objects.update_or_create(
            user=user,
            defaults={'category': profile_data.get('category')}
        )
        return user

    ROOT_EMAIL = 'hadescore.apex.technologies@gmail.com'

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('staff_profile', {})
        password = validated_data.pop('password', None)

        # Root account: only password and category may be changed; strip everything else
        if instance.email == self.ROOT_EMAIL:
            if password:
                instance.set_password(password)
                instance.save()
            
            # Still update category for root
            category = profile_data.get('category')
            if 'category' in profile_data or category is not None:
                StaffProfile.objects.update_or_create(
                    user=instance,
                    defaults={'category': category}
                )
            return instance

        if password:
            instance.set_password(password)

        instance = super().update(instance, validated_data)

        # Update or create StaffProfile
        if hasattr(self, 'initial_data') and 'category' in self.initial_data:
            category = profile_data.get('category')
            StaffProfile.objects.update_or_create(
                user=instance,
                defaults={'category': category}
            )
        else:
            category = instance.staff_profile.category if hasattr(instance, 'staff_profile') else None

        # Auto-sync category to all assigned students is removed since students are now assigned specific courses

        return instance
