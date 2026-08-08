from django.db import models
from django.conf import settings

class Assignment(models.Model):
    module = models.ForeignKey('modules.Module', on_delete=models.CASCADE, related_name='assignments', null=True, blank=True)
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='course_assignments', null=True, blank=True)
    students = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='assigned_tasks', blank=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    file_attachment = models.TextField(blank=True, null=True)  # URL of instructions PDF in Cloudflare R2
    due_date = models.DateTimeField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_assignments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class AssignmentSubmission(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending Review'),
        ('GRADED', 'Graded'),
        ('REJECTED', 'Needs Revision'),
    )
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assignment_submissions')
    file_submission = models.TextField()  # URL of submitted homework inside Cloudflare R2
    notes = models.TextField(blank=True, null=True)  # Notes from the student
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='PENDING')
    grade = models.CharField(max_length=10, blank=True, null=True)  # e.g. A, B+, 95, etc.
    feedback = models.TextField(blank=True, null=True)  # Staff reviewer feedback
    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='graded_submissions'
    )
    plagiarism_score = models.PositiveIntegerField(default=0, help_text="Plagiarism score in percentage (0-100)")
    plagiarism_report = models.TextField(blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    graded_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.student.email} - {self.assignment.title} ({self.status})"
