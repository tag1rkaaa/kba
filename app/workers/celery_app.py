from celery import Celery
from app.core.config import settings

# Инициализируем Celery, используя Redis из настроек проекта
celery_app = Celery(
    "kba_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],  # Указываем, где лежат функции задач
)

# Базовая оптимизация и настройка форматов
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
)
