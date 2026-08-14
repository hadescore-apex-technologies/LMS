#!/usr/bin/env bash
# exit on error
set -o errexit

echo "==> Upgrading pip..."
pip install --upgrade pip

echo "==> Installing Python backend dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
elif [ -f "backend/requirements.txt" ]; then
    pip install -r backend/requirements.txt
fi

echo "==> Running database migrations & collectstatic..."
if [ -f "manage.py" ]; then
    python manage.py migrate
    python manage.py collectstatic --no-input
elif [ -f "backend/manage.py" ]; then
    python backend/manage.py migrate
    python backend/manage.py collectstatic --no-input
fi

echo "==> Build completed successfully!"
