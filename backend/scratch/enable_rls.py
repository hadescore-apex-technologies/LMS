import os
import sys
# pyrefly: ignore [missing-import]
import django

# Add current working directory to python path
sys.path.insert(0, os.getcwd())

# Set up Django environment
os.environ['DJANGO_SETTINGS_MODULE'] = 'apps.core.settings'
django.setup()

# pyrefly: ignore [missing-import]
from django.db import connection

def enable_rls():
    with connection.cursor() as cursor:
        # Get all tables in the public schema
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE';
        """)
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Found {len(tables)} tables in the public schema.")
        
        for table in tables:
            try:
                # Enable RLS on the table
                cursor.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY;')
                print(f"[OK] Enabled Row Level Security (RLS) on: public.{table}")
            except Exception as e:
                print(f"[ERROR] Failed to enable RLS on public.{table}: {e}")

if __name__ == '__main__':
    enable_rls()
