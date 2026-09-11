import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    articles,
    auth,
    categories,
    favorites,
    files,
    import_articles,
    search,
    tags,
    users,
)

# Добавляем импорт нашего нового роутера для парсинга Excel
from app.api.endpoints.imports import router as excel_imports_router
from app.core.config import settings

# 1. Настраиваем логгер, который пишет и в консоль, и в файл
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("app_errors.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Приложение База Знаний",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(articles.router, prefix="/api/v1/articles", tags=["articles"])
    app.include_router(search.router, prefix="/api/v1/search", tags=["search"])
    app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
    app.include_router(
        categories.router, prefix="/api/v1/categories", tags=["categories"]
    )
    app.include_router(tags.router, prefix="/api/v1/tags", tags=["tags"])
    app.include_router(files.router, prefix="/api/v1/files", tags=["files"])
    app.include_router(import_articles.router, prefix="/api/v1/import", tags=["import"])
    app.include_router(favorites.router, prefix="/api/v1/favorites", tags=["favorites"])

    # Подключаем новый роутер (префикс уже есть внутри самого файла imports.py, поэтому тут просто /api/v1)
    app.include_router(excel_imports_router, prefix="/api/v1")

    @app.get("/api/v1/health/live")
    async def liveness():
        return {"status": "ok"}

    @app.get("/api/v1/health/ready")
    async def readiness():
        return {"status": "ok"}

    # 2. Глобальный перехватчик ошибок
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(
            f"Необработанная ошибка при запросе {request.method} {request.url.path}",
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": "Произошла внутренняя ошибка сервера. Мы уже работаем над её устранением!",
                "detail": str(exc),
            },
        )

    return app


app = create_app()
