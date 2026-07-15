from rest_framework import serializers
from apps.users.models import CustomUser, StaffProfile
from apps.categories.models import Category

class StaffUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    category = serializers.PrimaryKeyRelatedField(
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

    def create(self, validated_data):
        profile_data = validated_data.pop('staff_profile', {})
        password = validated_data.pop('password', 'apex123')
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

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('staff_profile', {})
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        
        instance = super().update(instance, validated_data)

        # Update or create StaffProfile
        StaffProfile.objects.update_or_create(
            user=instance,
            defaults={'category': profile_data.get('category')}
        )
        return instance
