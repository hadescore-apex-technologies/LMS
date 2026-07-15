from django.db import models

class Video(models.Model):
    STATUS_CHOICES = (
        ('uploading', 'Uploading'),
        ('ready', 'Ready'),
        ('failed', 'Failed'),
    )
    lesson = models.OneToOneField('lessons.Lesson', on_delete=models.CASCADE, related_name='video')
    cf_stream_id = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ready')
    duration = models.PositiveIntegerField(default=0)  # In seconds
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Video for: {self.lesson.title}"
