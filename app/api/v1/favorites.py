from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.models import Article, Favorite, User
from app.schemas.article import ArticleOut

router = APIRouter()


@router.get("/", response_model=list[ArticleOut])
async def get_favorites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список избранных статей текущего пользователя."""
    result = await db.execute(
        select(Article)
        .join(Favorite, Favorite.article_id == Article.id)
        .where(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{article_id}", status_code=201)
async def add_favorite(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Добавить статью в избранное."""
    # Проверяем что статья существует
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Статья не найдена")

    # Проверяем что ещё не в избранном
    existing = await db.execute(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.article_id == article_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Уже в избранном")

    favorite = Favorite(user_id=current_user.id, article_id=article_id)
    db.add(favorite)
    await db.commit()
    return {"status": "added"}


@router.delete("/{article_id}", status_code=204)
async def remove_favorite(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Убрать статью из избранного."""
    await db.execute(
        delete(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.article_id == article_id,
        )
    )
    await db.commit()


@router.get("/{article_id}/status")
async def get_favorite_status(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Проверить находится ли статья в избранном."""
    result = await db.execute(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.article_id == article_id,
        )
    )
    return {"is_favorite": result.scalar_one_or_none() is not None}
