#!/usr/bin/env bash
# exit on error
set -o errexit

echo "==> Upgrading pip..."
pip install --upgrade pip

echo "==> Installing Python backend dependencies..."
pip install -r requirements.txt

echo "==> Running database migrations & collectstatic..."
python manage.py migrate
python manage.py collectstatic --no-input

echo "==> Build completed successfully!"
