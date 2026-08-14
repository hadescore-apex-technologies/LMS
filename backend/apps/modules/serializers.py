# pyrefly: ignore [missing-import]
from rest_framework import serializers
from apps.modules.models import Module

class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ['id', 'course', 'title', 'order']

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            if not data.get('title') or str(data.get('title')).strip() == '':
                data['title'] = 'Untitled Module'
            if not data.get('course'):
                from apps.courses.models import Course
                c = Course.objects.first()
                if c:
                    data['course'] = c.id
        return super().to_internal_value(data)
