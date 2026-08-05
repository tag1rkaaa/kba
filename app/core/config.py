from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Современный синтаксис Pydantic v2 для конфигурации
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # База данных
    DATABASE_URL: str = "postgresql+asyncpg://kba:kba@localhost:5432/kba"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY_PRIVATE_FILE: str = "secrets/private.pem"
    SECRET_KEY_PUBLIC_FILE: str = "secrets/public.pem"
    ACCESS_TOKEN_TTL_MINUTES: int = 15
    REFRESH_TOKEN_TTL_DAYS: int = 30

    # MinIO / S3
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "kba"

    # Embeddings
    EMBEDDING_MODEL: str = "paraphrase-multilingual-MiniLM-L12-v2"

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    # Поиск
    SEARCH_DEFAULT_MODE: str = "hybrid"
    SEARCH_MAX_RESULTS: int = 100
    SEARCH_DEFAULT_LIMIT: int = 20

    # Версионирование статей
    MAX_ARTICLE_REVISIONS: int = 50


settings = Settings()
