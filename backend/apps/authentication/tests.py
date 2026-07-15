from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from apps.users.models import CustomUser, StudentProfile
from django.utils import timezone
from datetime import timedelta

class AuthenticationTests(APITestCase):

    def setUp(self):
        # Create Super Admin
        self.admin = CustomUser.objects.create_user(
            email='admin@test.com',
            password='AdminPassword123',
            role='SUPER_ADMIN',
            is_staff=True,
            is_superuser=True
        )

        # Create Staff
        self.staff = CustomUser.objects.create_user(
            email='staff@test.com',
            password='StaffPassword123',
            role='STAFF'
        )

        # Create Student
        self.student = CustomUser.objects.create_user(
            email='student@test.com',
            password='StudentPassword123',
            role='STUDENT'
        )
        self.student_profile = StudentProfile.objects.create(
            user=self.student,
            course_duration='90',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=90)
        )

        # Create Expired Student
        self.expired_student = CustomUser.objects.create_user(
            email='expired@test.com',
            password='ExpiredPassword123',
            role='STUDENT'
        )
        self.expired_student_profile = StudentProfile.objects.create(
            user=self.expired_student,
            course_duration='30',
            start_date=timezone.now().date() - timedelta(days=40),
            end_date=timezone.now().date() - timedelta(days=10) # Expired 10 days ago
        )

        self.login_url = reverse('token_obtain_pair')
        self.profile_url = reverse('profile-list') # Viewset routers register list route
        self.staff_url = reverse('staff-list')

    def test_login_success_admin(self):
        response = self.client.post(self.login_url, {
            'email': 'admin@test.com',
            'password': 'AdminPassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['role'], 'SUPER_ADMIN')

    def test_login_success_staff(self):
        response = self.client.post(self.login_url, {
            'email': 'staff@test.com',
            'password': 'StaffPassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['role'], 'STAFF')

    def test_login_success_student(self):
        response = self.client.post(self.login_url, {
            'email': 'student@test.com',
            'password': 'StudentPassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['role'], 'STUDENT')

    def test_login_invalid_credentials(self):
        response = self.client.post(self.login_url, {
            'email': 'student@test.com',
            'password': 'WrongPassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_expired_student(self):
        response = self.client.post(self.login_url, {
            'email': 'expired@test.com',
            'password': 'ExpiredPassword123'
        })
        # Serializer sets is_active=False and raises exceptions.AuthenticationFailed
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("Expired", response.data['detail'])
        
        # Verify database is updated to inactive
        self.expired_student.refresh_from_db()
        self.assertFalse(self.expired_student.is_active)

    def test_profile_retrieval_success(self):
        # Authenticate student
        login_res = self.client.post(self.login_url, {
            'email': 'student@test.com',
            'password': 'StudentPassword123'
        })
        token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # Request profile
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'student@test.com')
        self.assertIn('course_duration', response.data)

    def test_staff_management_permissions_as_admin(self):
        # Admin authentication
        login_res = self.client.post(self.login_url, {
            'email': 'admin@test.com',
            'password': 'AdminPassword123'
        })
        token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # Request staff list
        response = self.client.get(self.staff_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_staff_management_permissions_as_staff(self):
        # Staff authentication
        login_res = self.client.post(self.login_url, {
            'email': 'staff@test.com',
            'password': 'StaffPassword123'
        })
        token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # Staff requesting staff list should fail (only super admins can view/manage staff)
        response = self.client.get(self.staff_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
