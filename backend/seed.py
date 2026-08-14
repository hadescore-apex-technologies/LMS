import os
# pyrefly: ignore [missing-import]
import django

# Set Django environment settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'apps.core.settings')
django.setup()

from apps.users.models import CustomUser, StudentProfile
from apps.categories.models import Category
from apps.courses.models import Course, LiveClass
from apps.modules.models import Module
from apps.lessons.models import Lesson
from apps.quizzes.models import Quiz, Question
from apps.assignments.models import Assignment
# pyrefly: ignore [missing-import]
from django.utils import timezone
from datetime import timedelta

def seed():
    print("Seeding database...")
    
    # 1. Create Root Super Admin
    root_admin, created = CustomUser.objects.get_or_create(
        email='hadescore.apex.technologies@gmail.com',
        defaults={
            'first_name': 'Hadescore',
            'last_name': 'Admin',
            'role': 'SUPER_ADMIN',
            'is_staff': True,
            'is_superuser': True,
            'is_active': True
        }
    )
    root_admin.set_password('@Hadescore.com')
    root_admin.is_active = True
    root_admin.role = 'SUPER_ADMIN'
    root_admin.save()
    print("Root Super Admin verified: hadescore.apex.technologies@gmail.com / @Hadescore.com")



    # 3. Create Categories
    categories = ['Data Analytics', 'Python Full Stack', 'Java Full Stack', 'AI', 'UI UX', 'Digital Marketing', 'Aptitude']
    cat_objs = {}
    for cat_name in categories:
        slug = cat_name.lower().replace(' ', '-')
        cat, created = Category.objects.get_or_create(
            name=cat_name,
            defaults={'slug': slug}
        )
        cat_objs[cat_name] = cat
    print(f"Categories seeded: {list(cat_objs.keys())}")

    # 5. Create a course in AI
    course, created = Course.objects.get_or_create(
        slug='introduction-to-ai',
        defaults={
            'title': 'Introduction to Artificial Intelligence',
            'description': 'Learn the core concepts of Machine Learning, Deep Learning, and Neural Networks from scratch.',
            'category': cat_objs['AI'],
            'is_published': True
        }
    )
    if created:
        print("Course created: Introduction to Artificial Intelligence")
        
        # Add a Module
        module = Module.objects.create(
            course=course,
            title='Module 1: Machine Learning Basics',
            order=1
        )
        
        # Add a Lesson
        lesson = Lesson.objects.create(
            module=module,
            title='Lesson 1.1: Supervised vs Unsupervised Learning',
            content='### Introduction\nIn supervised learning, the model is trained on labeled data...',
            order=1
        )
        
        # Add a Quiz
        quiz = Quiz.objects.create(
            module=module,
            title='Machine Learning Foundations Quiz',
            passing_score=70
        )
        Question.objects.create(
            quiz=quiz,
            question_text='Which type of machine learning uses labeled data?',
            question_type='MCQ',
            options=['Supervised Learning', 'Unsupervised Learning', 'Reinforcement Learning', 'Semi-supervised Learning'],
            correct_answer='Supervised Learning'
        )
        Question.objects.create(
            quiz=quiz,
            question_text='Linear Regression is an unsupervised learning task.',
            question_type='TF',
            options=['True', 'False'],
            correct_answer='False'
        )

        # Add an Assignment
        Assignment.objects.create(
            module=module,
            title='Machine Learning Model Choice Homework',
            description='Write a 2-page report detailing when to use Supervised vs Unsupervised techniques for customer churn.',
            due_date=timezone.now() + timedelta(days=5)
        )
        
        # Add Live Classes
        LiveClass.objects.create(
            course=course,
            title='Daily Doubt Clearing & Mentorship Stream',
            scheduled_time=timezone.now() + timedelta(minutes=10),
            meeting_url='https://meet.google.com/apex-live-qa',
            status='LIVE',
            created_by=root_admin
        )
        LiveClass.objects.create(
            course=course,
            title='AI Live QA and Deep Learning Seminar',
            scheduled_time=timezone.now() + timedelta(days=2),
            meeting_url='https://meet.google.com/abc-defg-hij',
            status='UPCOMING',
            created_by=root_admin
        )
        print("Seeding operations completed successfully.")

if __name__ == '__main__':
    seed()
