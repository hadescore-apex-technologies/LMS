from django.db import models
from django.conf import settings

class Certificate(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates')
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='certificates')
    certificate_code = models.CharField(max_length=50, unique=True)  # Format e.g., HA-APEX-10023
    file_url = models.TextField()  # PDF location URL in Cloudflare R2
    issued_at = models.DateTimeField(auto_now_add=True)
    is_issued = models.BooleanField(default=True)
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='issued_certificates'
    )

    def __str__(self):
        return f"{self.student.email} - {self.course.title} ({self.certificate_code})"
