import logging
import json
import asyncio
from sqlalchemy import select
from app.workers.celery_app import celery_app
from app.services.embeddings import generate_embedding

# Правильные импорты для вашей структуры
from app.core.database import AsyncSessionLocal
from app.models.models import Article

logger = logging.getLogger(__name__)


async def _process_vector_async(article_id: int):
    """Асинхронная функция для работы с БД"""
    async with AsyncSessionLocal() as db:
        try:
            # Асинхронно ищем статью
            result = await db.execute(select(Article).where(Article.id == article_id))
            article = result.scalar_one_or_none()

            if not article:
                logger.error(f"Статья ID {article_id} не найдена в БД.")
                return False

            # Собираем текст из заголовка и содержимого
            content_str = json.dumps(article.content, ensure_ascii=False) if article.content else ""
            text_to_vectorize = f"{article.title}. {content_str}"

            # Магия: превращаем текст в вектор
            vector = generate_embedding(text_to_vectorize)

            # Сохраняем вектор в базу
            article.embedding = vector
            await db.commit()

            logger.info(f"Вектор для статьи ID {article_id} успешно сгенерирован и сохранен!")
            return True

        except Exception as e:
            logger.error(f"Ошибка при векторизации статьи {article_id}: {str(e)}")
            await db.rollback()
            return False


@celery_app.task(name="process_article_vector")
def process_article_vector(article_id: int):
    """Синхронная обертка Celery для запуска асинхронного кода"""
    logger.info(f"Начало векторизации статьи ID: {article_id}")

    # asyncio.run запускает асинхронную функцию внутри синхронного воркера
    return asyncio.run(_process_vector_async(article_id))
