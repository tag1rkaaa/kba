from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_role
from app.models.models import User
from app.schemas.article import ArticleCreate, ArticleDetail, ArticleOut, ArticleUpdate
from app.services.article_service import ArticleService
from app.workers.tasks import process_article_vector

router = APIRouter()


@router.get("/", response_model=list[ArticleOut])
async def list_articles(
    skip: int = 0,
    limit: int = 20,
    source: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ArticleService(db).list(skip=skip, limit=limit, source=source)


@router.post("/", response_model=ArticleOut, status_code=status.HTTP_201_CREATED)
async def create_article(
    payload: ArticleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("editor", "moderator", "admin"),
):
    article = await ArticleService(db).create(payload, author_id=current_user.id)
    process_article_vector.delay(article.id)
    return article


@router.get("/{article_id}", response_model=ArticleDetail)
async def get_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),  # любой авторизованный
):
    return await ArticleService(db).get_by_id(article_id)


@router.patch("/{article_id}", response_model=ArticleOut)
async def update_article(
    article_id: int,
    payload: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("editor", "moderator", "admin"),
):
    article = await ArticleService(db).update(article_id, payload, editor_id=current_user.id)
    process_article_vector.delay(article.id)
    return article


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("moderator", "admin"),
):
    await ArticleService(db).archive(article_id)


@router.get("/{article_id}/revisions")
async def get_revisions(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ArticleService(db).get_revisions(article_id)


@router.post("/{article_id}/restore/{revision_id}", response_model=ArticleOut)
async def restore_revision(
    article_id: int,
    revision_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("editor", "moderator", "admin"),
):
    return await ArticleService(db).restore_revision(
        article_id, revision_id, editor_id=current_user.id
    )
