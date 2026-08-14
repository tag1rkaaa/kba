from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_role
from app.models.models import Article, ArticleFeedback, User
from app.schemas.article import ArticleCreate, ArticleDetail, ArticleOut, ArticleUpdate
from app.services.article_service import ArticleService
from app.services.audit_service import AuditService
from app.workers.tasks import process_article_vector

router = APIRouter()


class FeedbackCreate(BaseModel):
    message: str


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

    await AuditService(db).log(
        user_id=current_user.id,
        action="create",
        entity_type="article",
        entity_id=article.id,
        diff={"title": article.title},
    )

    process_article_vector.delay(article.id)
    return article


# ==========================================
# ЭНДПОИНТЫ ДЛЯ РАБОТЫ С ЖАЛОБАМИ (ФИДБЕК)
# ==========================================


@router.get("/feedback/list")
async def get_feedback_list(
    status: str = "new",
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("moderator", "admin"),
):
    """Получить список сообщений об ошибках (с фильтрацией)"""
    query = (
        select(ArticleFeedback, Article.title, User.email)
        .join(Article, ArticleFeedback.article_id == Article.id)
        .join(User, ArticleFeedback.user_id == User.id)
        .order_by(ArticleFeedback.created_at.desc())
    )

    if status != "all":
        query = query.where(ArticleFeedback.status == status)

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id": row.ArticleFeedback.id,
            "article_id": row.ArticleFeedback.article_id,
            "article_title": row.title,
            "user_email": row.email,
            "message": row.ArticleFeedback.message,
            "status": row.ArticleFeedback.status,
            "created_at": row.ArticleFeedback.created_at,
        }
        for row in rows
    ]


@router.patch("/feedback/{feedback_id}/resolve")
async def resolve_feedback(
    feedback_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("moderator", "admin"),
):
    """Отметить жалобу как исправленную"""
    result = await db.execute(select(ArticleFeedback).where(ArticleFeedback.id == feedback_id))
    feedback = result.scalar_one_or_none()

    if feedback:
        feedback.status = "resolved"
        await db.commit()
    return {"status": "ok"}


@router.get("/{article_id}", response_model=ArticleDetail)
async def get_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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

    await AuditService(db).log(
        user_id=current_user.id,
        action="update",
        entity_type="article",
        entity_id=article.id,
        diff=payload.model_dump(exclude_unset=True, exclude={"content"}),
    )

    process_article_vector.delay(article.id)
    return article


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("moderator", "admin"),
):
    await ArticleService(db).archive(article_id)

    await AuditService(db).log(
        user_id=current_user.id,
        action="archive",
        entity_type="article",
        entity_id=article_id,
    )


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


# ==========================================
# ОБРАТНАЯ СВЯЗЬ / СООБЩЕНИЯ О НЕРАБОЧИХ ДАННЫХ
# ==========================================


@router.post("/{article_id}/feedback", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    article_id: int,
    payload: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отправка сообщения об ошибке или неточности в статье"""
    new_feedback = ArticleFeedback(
        article_id=article_id,
        user_id=current_user.id,
        message=payload.message,
    )
    db.add(new_feedback)
    await db.commit()
    return {"status": "ok", "message": "Feedback submitted successfully"}
