from rest_framework import serializers
from apps.quizzes.models import Quiz, Question, QuizAttempt

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'quiz', 'question_text', 'question_type', 'options', 'correct_answer']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.question_type == 'TF' and (not instance.options or len(instance.options) == 0):
            ret['options'] = ['True', 'False']
        return ret

class StudentQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        # Hides the correct answer when serving to students
        model = Question
        fields = ['id', 'question_text', 'question_type', 'options']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.question_type == 'TF' and (not instance.options or len(instance.options) == 0):
            ret['options'] = ['True', 'False']
        return ret

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    module_title = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ['id', 'module', 'module_title', 'course_title', 'title', 'passing_score', 'timer_minutes', 'max_retries', 'randomize_questions', 'questions']

    def get_module_title(self, obj):
        return obj.module.title if obj.module else None

    def get_course_title(self, obj):
        if obj.module and obj.module.course:
            return obj.module.course.title
        return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'STUDENT':
            questions = list(instance.questions.all())
            if instance.randomize_questions:
                import random
                random.shuffle(questions)
            ret['questions'] = StudentQuestionSerializer(questions, many=True).data
        return ret

class QuizAttemptSerializer(serializers.ModelSerializer):
    student_email = serializers.CharField(source='student.email', read_only=True)
    student_first_name = serializers.CharField(source='student.first_name', read_only=True)
    student_last_name = serializers.CharField(source='student.last_name', read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)

    class Meta:
        model = QuizAttempt
        fields = ['id', 'student', 'student_email', 'student_first_name', 'student_last_name', 'quiz', 'quiz_title', 'score', 'passed', 'completed_at']
        read_only_fields = ['student', 'score', 'passed', 'completed_at']
