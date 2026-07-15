import os
from celery import Celery

# Set default settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'apps.core.settings')

app = Celery('apex_lms')

# Load task config from Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Automatically discover tasks from all registered apps
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
