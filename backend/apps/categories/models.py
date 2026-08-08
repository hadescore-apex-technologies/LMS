from django.db import models

class Category(models.Model):
    TYPE_CHOICES = (
        ('COURSE', 'Course Mode'),
        ('LIVE', 'Live Mentoring Mode'),
    )
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    category_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='COURSE')

    def __str__(self):
        return f"{self.name} ({self.category_type})"

    class Meta:
        verbose_name_plural = "Categories"
