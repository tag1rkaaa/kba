from app.core.config import settings


class EmbeddingService:
    """
    Генерирует векторные представления текста через sentence-transformers.
    Используется Celery-воркером (не в основном процессе API).
    """

    def __init__(self):
        self._model = None

    def _load_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(settings.EMBEDDING_MODEL)

    def encode(self, text: str) -> list[float]:
        self._load_model()
        vector = self._model.encode(text, normalize_embeddings=True)
        return vector.tolist()

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        self._load_model()
        vectors = self._model.encode(texts, normalize_embeddings=True, batch_size=32)
        return [v.tolist() for v in vectors]


embedding_service = EmbeddingService()
