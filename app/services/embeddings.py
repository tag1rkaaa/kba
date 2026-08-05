import logging

from sentence_transformers import SentenceTransformer

from app.core.config import settings

logger = logging.getLogger(__name__)

logger.info(f"Инициализация модели: {settings.EMBEDDING_MODEL}")
model = SentenceTransformer(settings.EMBEDDING_MODEL)
logger.info("Модель успешно загружена!")


def generate_embedding(text: str) -> list[float]:
    """Превращает текст в вектор (список чисел)."""
    if not text or not text.strip():
        return []

    vector = model.encode(text)
    return vector.tolist()
