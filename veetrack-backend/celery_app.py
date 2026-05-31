"""Celery application for VeeTrack background tasks."""
from celery import Celery
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

app = Celery(
    "veetrack",
    broker=REDIS_URL,
    backend=REDIS_URL.replace("/0", "/1"),
    include=["tasks.ingestion_tasks", "tasks.alert_tasks", "tasks.report_tasks"],
)

app.conf.update(
    task_serializer="json",
    result_expires=1800,
    worker_concurrency=4,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "fetch-active-keywords-15min": {
            "task": "tasks.ingestion_tasks.process_all_active_keywords",
            "schedule": 900.0,
        },
        "evaluate-alerts-15min": {
            "task": "tasks.alert_tasks.evaluate_all_keywords",
            "schedule": 900.0,
        },
        "send-daily-reports-8am-ist": {
            "task": "tasks.report_tasks.send_all_daily_reports",
            "schedule": {"hour": 2, "minute": 30},
        },
    },
    timezone="UTC",
)
