from django.db import models

class Lesson(models.Model):
    module = models.ForeignKey('modules.Module', on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True, null=True)  # Markdown text lesson content
    order = models.PositiveIntegerField(default=0)
    thumbnail = models.TextField(blank=True, null=True)
    pdf_ppt_url = models.TextField(blank=True, null=True)
    zip_source_url = models.TextField(blank=True, null=True)
    external_links = models.JSONField(default=list, blank=True)
    additional_notes = models.TextField(blank=True, null=True)
    faqs = models.JSONField(default=list, blank=True, help_text="List of FAQs e.g. [{'q': 'question', 'a': 'answer'}]")
    estimated_duration = models.PositiveIntegerField(default=10, help_text="Estimated study duration in minutes")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.module.title} - {self.title}"

class LessonProgress(models.Model):
    student = models.ForeignKey('users.CustomUser', on_delete=models.CASCADE, related_name='lesson_progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='progress_records')
    completed = models.BooleanField(default=False)
    resume_time = models.FloatField(default=0.0)  # Playback resume position in seconds
    watch_percentage = models.FloatField(default=0.0)  # Percentage of video watched
    watch_time = models.PositiveIntegerField(default=0)  # Total seconds watched
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ('student', 'lesson')

    def __str__(self):
        return f"{self.student.email} - {self.lesson.title} (Completed: {self.completed})"

class LessonBookmark(models.Model):
    student = models.ForeignKey('users.CustomUser', on_delete=models.CASCADE, related_name='video_bookmarks')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='bookmarks')
    position_seconds = models.FloatField()
    note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['position_seconds']

    def __str__(self):
        return f"Bookmark at {self.position_seconds}s by {self.student.email}"

class LessonNote(models.Model):
    student = models.ForeignKey('users.CustomUser', on_delete=models.CASCADE, related_name='lesson_notes')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='notes')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Note by {self.student.email} on {self.lesson.title}"
