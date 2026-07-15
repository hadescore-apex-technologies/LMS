from django.db import models
from django.conf import settings

class Quiz(models.Model):
    module = models.OneToOneField('modules.Module', on_delete=models.CASCADE, related_name='quiz', null=True, blank=True)
    title = models.CharField(max_length=200)
    passing_score = models.PositiveIntegerField(default=70)  # Percentage required (e.g. 70%)
    timer_minutes = models.PositiveIntegerField(default=15, help_text="Time limit in minutes")
    max_retries = models.PositiveIntegerField(default=3, help_text="Maximum allowed attempts")
    randomize_questions = models.BooleanField(default=True, help_text="Randomize question sequence for students")

    def __str__(self):
        return self.title

class Question(models.Model):
    TYPE_CHOICES = (
        ('MCQ', 'Multiple Choice'),
        ('TF', 'True/False'),
        ('MSQ', 'Multiple Select'),
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='MCQ')
    options = models.JSONField(help_text="A list of options. E.g., ['A', 'B', 'C', 'D']")
    correct_answer = models.CharField(max_length=200, help_text="The exact string match of the correct option")

    def __str__(self):
        return f"{self.quiz.title} - {self.question_text[:30]}"

class QuizAttempt(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    score = models.FloatField()  # Score obtained as a percentage (e.g., 85.0)
    passed = models.BooleanField()
    completed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.email} - {self.quiz.title} - Score: {self.score}%"
