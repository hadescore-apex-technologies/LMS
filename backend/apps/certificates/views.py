import random
from rest_framework import viewsets, status, decorators, response
from rest_framework.permissions import IsAuthenticated
from apps.certificates.models import Certificate
from apps.certificates.serializers import CertificateSerializer
from apps.core.permissions import IsSuperAdminOrStaff
from apps.core.models import AuditLog

class CertificateViewSet(viewsets.ModelViewSet):
    serializer_class = CertificateSerializer

    def create(self, request, *args, **kwargs):
        student_id = request.data.get('student')
        course_id = request.data.get('course')
        
        with open('api_debug.log', 'a') as f:
            f.write(f"\n--- CERTIFICATE CREATE --- \nUser: {request.user.email} (Role: {request.user.role})\nData: {request.data}\n")
        
        # Enforce staff restriction: Staff can only issue certificates to their assigned students
        if request.user.role == 'STAFF' and student_id:
            is_assigned = request.user.assigned_students.filter(user_id=student_id).exists() or \
                          request.user.assigned_live_students.filter(user_id=student_id).exists()
            if not is_assigned:
                with open('api_debug.log', 'a') as f:
                    f.write("Failed: STAFF restriction not met.\n")
                return response.Response(
                    {"error": "You can only issue certificates to students assigned to you."},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Check if a certificate already exists for this student and course
        existing_cert = Certificate.objects.filter(student_id=student_id, course_id=course_id).first()
        if existing_cert:
            # Overwrite/update the existing certificate
            serializer = self.get_serializer(existing_cert, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            certificate_code = request.data.get('certificate_code')
            if not certificate_code and not existing_cert.certificate_code:
                rand_num = random.randint(10000, 99999)
                certificate_code = f"HA-APEX-{rand_num}"
            
            if certificate_code:
                updated_cert = serializer.save(certificate_code=certificate_code, issued_by=request.user)
            else:
                updated_cert = serializer.save(issued_by=request.user)
                
            # Log audit log
            AuditLog.objects.create(
                user=request.user,
                action=f"Manually Updated Certificate {existing_cert.certificate_code} for student {existing_cert.student.email} on Course {existing_cert.course.title}",
                ip_address=request.META.get('REMOTE_ADDR')
            )

            # Send course completion & certificate email if issued
            if updated_cert.is_issued:
                from apps.core.emails import send_course_completion_email
                send_course_completion_email(updated_cert.id)

            return response.Response(serializer.data, status=status.HTTP_200_OK)
            
        # Otherwise, proceed with default creation
        try:
            res = super().create(request, *args, **kwargs)
            with open('api_debug.log', 'a') as f:
                f.write(f"Success: Certificate created. Status: {res.status_code}\n")
            return res
        except Exception as e:
            with open('api_debug.log', 'a') as f:
                f.write(f"Error during certificate creation: {str(e)}\n")
            raise

    def perform_create(self, serializer):
        certificate_code = serializer.validated_data.get('certificate_code')
        if not certificate_code:
            rand_num = random.randint(10000, 99999)
            certificate_code = f"HA-APEX-{rand_num}"
        
        cert = serializer.save(
            certificate_code=certificate_code,
            issued_by=self.request.user
        )
        
        AuditLog.objects.create(
            user=self.request.user,
            action=f"Manually Issued Certificate {certificate_code} for student {serializer.validated_data['student'].email} on Course {serializer.validated_data['course'].title}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

        if cert.is_issued:
            from apps.core.emails import send_course_completion_email
            send_course_completion_email(cert.id)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        if self.action == 'verify':
            return []
        return [IsSuperAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        from apps.users.models import CustomUser

        if not isinstance(user, CustomUser):
            return Certificate.objects.none()

        qs = Certificate.objects.select_related('student', 'course')
        student_id = self.request.query_params.get('student')
        if student_id:
            qs = qs.filter(student_id=student_id)

        if user.role == 'STUDENT':
            # Run dynamic on-demand checks for each assigned course
            from apps.courses.models import Course
            from apps.categories.models import Category
            from apps.certificates.utils import check_and_generate_certificate
            
            assigned_courses = user.student_profile.courses.filter(is_published=True) if hasattr(user, 'student_profile') else []
            for course in assigned_courses:
                check_and_generate_certificate(user, course)

            return qs.filter(student=user, is_issued=True)

        if user.role == 'STAFF':
            from django.db.models import Q
            return qs.filter(
                Q(student__student_profile__assigned_staff=user) |
                Q(student__student_profile__assigned_live_staff=user)
            ).distinct()

        return qs

    @decorators.action(detail=False, methods=['get'], url_path='verify', permission_classes=[])
    def verify(self, request):
        code = request.query_params.get('code')
        if not code:
            return response.Response(
                {"error": "Certificate credential code is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            certificate = Certificate.objects.get(certificate_code=code, is_issued=True)
            return response.Response({
                "valid": True,
                "certificate_code": certificate.certificate_code,
                "student_email": certificate.student.email,
                "student_name": f"{certificate.student.first_name} {certificate.student.last_name}".strip() or certificate.student.username,
                "course_title": certificate.course.title,
                "issued_at": certificate.issued_at,
                "verification_url": f"https://apex-lms.hadescore.com/verify-certificate?code={certificate.certificate_code}"
            })
        except Certificate.DoesNotExist:
            return response.Response(
                {"valid": False, "error": "Invalid credential code"},
                status=status.HTTP_404_NOT_FOUND
            )

    @decorators.action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        student_id = request.data.get('student')
        course_id = request.data.get('course')

        if not student_id or not course_id:
            return response.Response(
                {"error": "student and course fields are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce staff restriction: Staff can only generate certificates for assigned students
        if request.user.role == 'STAFF':
            is_assigned = request.user.assigned_students.filter(user_id=student_id).exists() or \
                          request.user.assigned_live_students.filter(user_id=student_id).exists()
            if not is_assigned:
                return response.Response(
                    {"error": "You can only generate certificates for students assigned to you."},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Enforce Business Rules: 100% completion + required quiz + required assignments
        from apps.lessons.models import Lesson, LessonProgress
        from apps.quizzes.models import Quiz, QuizAttempt
        from apps.assignments.models import Assignment, AssignmentSubmission

        # 1. Lesson Completion Check
        total_lessons = Lesson.objects.filter(module__course_id=course_id).count()
        completed_lessons = LessonProgress.objects.filter(
            student_id=student_id, 
            lesson__module__course_id=course_id, 
            completed=True
        ).count()
        
        if total_lessons == 0 or completed_lessons < total_lessons:
            return response.Response(
                {"error": f"Student has not completed all lessons ({completed_lessons}/{total_lessons} completed)"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Quiz Pass Check
        quizzes = Quiz.objects.filter(module__course_id=course_id)
        for quiz in quizzes:
            passed = QuizAttempt.objects.filter(student_id=student_id, quiz=quiz, passed=True).exists()
            if not passed:
                return response.Response(
                    {"error": f"Student has not passed the required checkpoint quiz: {quiz.title}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 3. Assignment Approval Check
        assignments = Assignment.objects.filter(module__course_id=course_id)
        for assign in assignments:
            approved = AssignmentSubmission.objects.filter(
                student_id=student_id, 
                assignment=assign
            ).exists()
            if not approved:
                return response.Response(
                    {"error": f"Student has not submitted the required homework assignment: {assign.title}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Generate a unique certificate code
        rand_num = random.randint(10000, 99999)
        cert_code = f"HA-APEX-{rand_num}"

        # In production, this PDF is compiled and saved to Cloudflare R2
        mock_file_url = f"https://hadescore-apex-lms-storage.r2.cloudflarestorage.com/certificates/{cert_code}.pdf"

        # Create record
        certificate = Certificate.objects.create(
            student_id=student_id,
            course_id=course_id,
            certificate_code=cert_code,
            file_url=mock_file_url,
            issued_by=request.user
        )

        AuditLog.objects.create(
            user=request.user,
            action=f"Issued Certificate {cert_code} for student {certificate.student.email} on Course {certificate.course.title}",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        serializer = self.get_serializer(certificate)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)
