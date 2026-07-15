from django.db import models
from apps.courses.discussion_models import CourseDiscussionPost, CourseDiscussionComment

class Course(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField(blank=True, null=True)
    thumbnail = models.TextField(blank=True, null=True)
    category = models.ForeignKey('categories.Category', on_delete=models.CASCADE, related_name='courses')
    mentor = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mentored_courses',
        limit_choices_to={'role': 'STAFF'}
    )
    is_published = models.BooleanField(default=True)
    status = models.CharField(max_length=15, choices=(('DRAFT', 'Draft'), ('PUBLISHED', 'Published'), ('ARCHIVED', 'Archived')), default='PUBLISHED')
    requirements = models.TextField(blank=True, null=True)
    outcomes = models.TextField(blank=True, null=True)
    learning_path = models.TextField(blank=True, null=True)
    instructor_name = models.CharField(max_length=150, blank=True, null=True, default='Apex Instructor')
    instructor_role = models.CharField(max_length=150, blank=True, null=True, default='Instructor / Coordinator')
    banner = models.TextField(blank=True, null=True)
    seo_title = models.CharField(max_length=150, blank=True, null=True)
    seo_description = models.TextField(blank=True, null=True)
    seo_keywords = models.CharField(max_length=250, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class LiveClass(models.Model):
    STATUS_CHOICES = (
        ('UPCOMING', 'Upcoming'),
        ('LIVE', 'Live'),
        ('COMPLETED', 'Completed'),
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='live_classes')
    title = models.CharField(max_length=200)
    scheduled_time = models.DateTimeField()
    meeting_url = models.URLField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='UPCOMING')

    def __str__(self):
        return f"{self.title} - {self.status}"
