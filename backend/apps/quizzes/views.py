# pyrefly: ignore [missing-import]
from rest_framework import viewsets, status, decorators, response
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated
from apps.quizzes.models import Quiz, Question, QuizAttempt
from apps.quizzes.serializers import QuizSerializer, QuestionSerializer, StudentQuestionSerializer, QuizAttemptSerializer
from apps.core.permissions import IsSuperAdminOrStaff, IsStudent
from apps.core.models import AuditLog

class QuizViewSet(viewsets.ModelViewSet):
    serializer_class = QuizSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'submit']:
            return [IsAuthenticated()]
        return [IsSuperAdminOrStaff()]

    def get_queryset(self):
        from typing import cast
        # pyrefly: ignore [missing-import]
        from rest_framework.request import Request
        from apps.users.models import CustomUser
        
        request = cast(Request, self.request)
        user = request.user
        if not isinstance(user, CustomUser):
            return Quiz.objects.none()

        module_id = request.query_params.get('module')
        course_id = request.query_params.get('course')

        if user.role == 'STUDENT':
            profile = getattr(user, 'student_profile', None)
            student_courses = list(profile.courses.all()) if profile else []
            staff = (profile.assigned_staff or profile.assigned_live_staff) if profile else None
            staff_cat = getattr(getattr(staff, 'staff_profile', None), 'category', None)
            
            qs = Quiz.objects.filter(module__course__is_published=True)
            if student_courses or staff_cat or staff:
                # pyrefly: ignore [missing-import]
                from django.db.models import Q
                filters = Q()
                if student_courses:
                    filters |= Q(module__course__in=student_courses)
                if staff_cat:
                    filters |= Q(module__course__category=staff_cat)
                if staff:
                    filters |= Q(module__course__mentor=staff)
                qs = qs.filter(filters).distinct()
        elif user.role == 'STAFF':
            category = getattr(user, 'staff_profile', None) and user.staff_profile.category
            if category:
                qs = Quiz.objects.filter(module__course__category=category)
            else:
                qs = Quiz.objects.all()
        else:
            qs = Quiz.objects.all()

        qs = qs.select_related('module', 'module__course', 'module__course__category').prefetch_related('questions')

        if module_id:
            qs = qs.filter(module_id=module_id)
        if course_id:
            qs = qs.filter(module__course_id=course_id)
        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # Override to hide correct answers for students
        from apps.users.models import CustomUser
        user = request.user
        if isinstance(user, CustomUser) and user.role == 'STUDENT':
            questions = list(instance.questions.all())
            if instance.randomize_questions:
                import random
                random.shuffle(questions)
            q_serializer = StudentQuestionSerializer(questions, many=True)
            data['questions'] = q_serializer.data
            
        return response.Response(data)

    @decorators.action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        quiz = self.get_object()
        from apps.users.models import CustomUser
        user = request.user
        
        if not isinstance(user, CustomUser) or user.role != 'STUDENT':
            return response.Response(
                {"error": "Only students can submit quiz attempts"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce retry rules limit check

        previous_attempts = QuizAttempt.objects.filter(student=user, quiz=quiz).count()
        if previous_attempts >= quiz.max_retries:
            return response.Response(
                {"error": f"You have reached the maximum attempt limit of {quiz.max_retries} for this checkpoint."},
                status=status.HTTP_400_BAD_REQUEST
            )

        answers = request.data.get('answers', []) # Expected list of {"question_id": int, "answer": str}
        
        questions = {q.id: q for q in quiz.questions.all()}
        if not questions:
            return response.Response(
                {"error": "This quiz contains no questions to evaluate"},
                status=status.HTTP_400_BAD_REQUEST
            )

        correct_count = 0
        total_questions = len(questions)

        for ans in answers:
            q_id = ans.get('question_id')
            student_ans = ans.get('answer')
            
            if q_id in questions:
                question = questions[q_id]
                correct_ans = question.correct_answer
                
                if question.question_type == 'MSQ':
                    if isinstance(student_ans, list):
                        s_set = {str(x).strip().lower() for x in student_ans}
                    elif isinstance(student_ans, str):
                        s_set = {x.strip().lower() for x in student_ans.split(',') if x.strip()}
                    else:
                        s_set = set()
                    
                    c_set = {x.strip().lower() for x in correct_ans.split(',') if x.strip()}
                    if s_set == c_set and c_set:
                        correct_count += 1
                elif question.question_type == 'TF':
                    def normalize_tf(val):
                        v = str(val).strip().lower()
                        if v in ['true', 't', 'yes', 'y', '1']:
                            return 'true'
                        if v in ['false', 'f', 'no', 'n', '0']:
                            return 'false'
                        return v
                    if normalize_tf(student_ans) == normalize_tf(correct_ans):
                        correct_count += 1
                else:
                    s_val = str(student_ans).strip().lower()
                    c_val = str(correct_ans).strip().lower()
                    if s_val == c_val:
                        correct_count += 1
                    elif len(c_val) == 1 and s_val.startswith(c_val):
                        correct_count += 1
                    elif len(s_val) == 1 and c_val.startswith(s_val):
                        correct_count += 1

        score = (correct_count / total_questions) * 100.0 if total_questions > 0 else 0.0
        passed = score >= quiz.passing_score

        # Save student attempt
        attempt = QuizAttempt.objects.create(
            student=user,
            quiz=quiz,
            score=score,
            passed=passed
        )

        course = getattr(getattr(quiz, 'module', None), 'course', None) or getattr(quiz, 'course', None)
        if course:
            from apps.certificates.utils import check_and_generate_certificate
            check_and_generate_certificate(user, course)

        return response.Response({
            "message": "Quiz graded successfully",
            "score": score,
            "passed": passed,
            "correct_count": correct_count,
            "total_questions": total_questions,
            "passing_score": quiz.passing_score
        })

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [IsSuperAdminOrStaff]

class QuizAttemptViewSet(viewsets.ModelViewSet):
    serializer_class = QuizAttemptSerializer

    def get_permissions(self):
        if self.action in ['destroy', 'delete_student']:
            return [IsSuperAdminOrStaff()]
        return [IsAuthenticated()]

    def get_queryset(self):
        from apps.users.models import CustomUser
        user = self.request.user
        if not isinstance(user, CustomUser):
            return QuizAttempt.objects.none()

        qs = QuizAttempt.objects.select_related('student', 'quiz')

        if user.role == 'STUDENT':
            return qs.filter(student=user)

        elif user.role == 'STAFF':
            # Filter by directly assigned students only
            # pyrefly: ignore [missing-import]
            from django.db.models import Q
            return qs.filter(
                Q(student__student_profile__assigned_staff=user) |
                Q(student__student_profile__assigned_live_staff=user)
            ).distinct()

        # SUPER_ADMIN sees all — optionally filter by student email
        student_email = self.request.query_params.get('student_email', '').strip()
        if student_email:
            qs = qs.filter(student__email__icontains=student_email)
        return qs

    @decorators.action(detail=False, methods=['delete'], url_path='delete_student')
    def delete_student(self, request):
        email = request.query_params.get('email')
        if not email:
            return response.Response({"error": "Email parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        from apps.users.models import CustomUser
        user = request.user
        if not isinstance(user, CustomUser) or user.role not in ['SUPER_ADMIN', 'STAFF']:
            return response.Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        attempts = QuizAttempt.objects.filter(student__email=email)
        
        if user.role == 'STAFF':
            # Only delete attempts for students directly assigned to this staff
            # pyrefly: ignore [missing-import]
            from django.db.models import Q
            attempts = attempts.filter(
                Q(student__student_profile__assigned_staff=user) |
                Q(student__student_profile__assigned_live_staff=user)
            )
                
        count = attempts.count()
        attempts.delete()
        
        AuditLog.objects.create(
            user=user,
            action=f"Deleted all {count} quiz attempts for student {email}",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return response.Response({"message": f"Successfully deleted {count} quiz attempts for {email}."}, status=status.HTTP_200_OK)

