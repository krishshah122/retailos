# This will ensure the celery app is always imported when
# Django starts so that shared_task will use this app.
from retailos.celery import app as celery_app

__all__ = ("celery_app",)
