"""Celery configuration for RetailOS."""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "retailos.settings")

app = Celery("retailos")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
