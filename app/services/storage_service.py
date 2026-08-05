from minio import Minio
from minio.error import S3Error
import uuid
from datetime import timedelta

from app.core.config import settings


class StorageService:
    def __init__(self):
        self.client = Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=False,  # в dev без HTTPS
        )
        self._ensure_bucket()

    def _ensure_bucket(self):
        """Создаёт bucket если не существует."""
        try:
            if not self.client.bucket_exists(settings.MINIO_BUCKET):
                self.client.make_bucket(settings.MINIO_BUCKET)
        except S3Error as e:
            print(f"MinIO bucket error: {e}")

    def get_upload_url(self, filename: str, content_type: str) -> dict:
        """
        Генерирует presigned URL для загрузки файла напрямую в MinIO.
        Клиент делает PUT запрос по этому URL — файл идёт мимо API сервера.
        """
        # Генерируем уникальное имя чтобы избежать коллизий
        ext = filename.rsplit(".", 1)[-1] if "." in filename else ""
        object_name = f"{uuid.uuid4()}.{ext}" if ext else str(uuid.uuid4())

        url = self.client.presigned_put_object(
            bucket_name=settings.MINIO_BUCKET,
            object_name=object_name,
            expires=timedelta(minutes=15),
        )

        return {
            "upload_url": url,
            "object_name": object_name,
            "filename": filename,
        }

    def get_download_url(self, object_name: str) -> str:
        """Генерирует временную ссылку для скачивания файла."""
        return self.client.presigned_get_object(
            bucket_name=settings.MINIO_BUCKET,
            object_name=object_name,
            expires=timedelta(hours=1),
        )

    def delete_file(self, object_name: str) -> None:
        """Удаляет файл из MinIO."""
        try:
            self.client.remove_object(settings.MINIO_BUCKET, object_name)
        except S3Error as e:
            print(f"MinIO delete error: {e}")


# Синглтон — один клиент на всё приложение
storage_service = StorageService()
