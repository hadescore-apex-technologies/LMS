import os
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
from django.utils import timezone
from datetime import timedelta

def seed():
    print("Seeding database...")
    
    # 1. Create Super Admin
    admin_user, created = CustomUser.objects.get_or_create(
        email='admin@apex.com',
        defaults={
            'first_name': 'Owner',
            'last_name': 'Apex',
            'role': 'SUPER_ADMIN',
            'is_staff': True,
            'is_superuser': True
        }
    )
    if created:
        admin_user.set_password('admin123')
        admin_user.save()
        print("Super Admin created: admin@apex.com / admin123")
    else:
        print("Super Admin already exists.")

    # 2. Create Staff
    staff_user, created = CustomUser.objects.get_or_create(
        email='staff@apex.com',
        defaults={
            'first_name': 'Sarah',
            'last_name': 'Instructor',
            'role': 'STAFF'
        }
    )
    if created:
        staff_user.set_password('staff123')
        staff_user.save()
        print("Staff created: staff@apex.com / staff123")
    else:
        print("Staff already exists.")

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

    # 4. Create Student
    student_user, created = CustomUser.objects.get_or_create(
        email='student@apex.com',
        defaults={
            'first_name': 'John',
            'last_name': 'Doe',
            'role': 'STUDENT'
        }
    )
    if created:
        student_user.set_password('student123')
        student_user.save()
        
        # Create Student Profile
        profile = StudentProfile.objects.create(
            user=student_user,
            phone='+15550199',
            course_duration='90',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=90),
            notes='Initial seed student account'
        )
        # Assign student to 'AI' and 'Python Full Stack' categories
        profile.categories.add(cat_objs['AI'], cat_objs['Python Full Stack'])
        print("Student created: student@apex.com / student123 (assigned to AI and Python Full Stack)")
    else:
        print("Student already exists.")

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
        
        # Add a Live Class
        LiveClass.objects.create(
            course=course,
            title='AI Live QA and Deep Learning Seminar',
            scheduled_time=timezone.now() + timedelta(days=2),
            meeting_url='https://meet.google.com/abc-defg-hij',
            status='UPCOMING'
        )
        print("Seeding operations completed successfully.")

if __name__ == '__main__':
    seed()
