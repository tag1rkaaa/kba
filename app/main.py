from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1 import (
    articles,
    search,
    auth,
    users,
    categories,
    tags,
    files,
    import_articles,
    favorites,
)


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
    app.include_router(categories.router, prefix="/api/v1/categories", tags=["categories"])
    app.include_router(tags.router, prefix="/api/v1/tags", tags=["tags"])
    app.include_router(files.router, prefix="/api/v1/files", tags=["files"])
    app.include_router(import_articles.router, prefix="/api/v1/import", tags=["import"])
    app.include_router(favorites.router, prefix="/api/v1/favorites", tags=["favorites"])

    @app.get("/api/v1/health/live")
    async def liveness():
        return {"status": "ok"}

    @app.get("/api/v1/health/ready")
    async def readiness():
        return {"status": "ok"}

    return app


app = create_app()
