from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.models import User
from app.repositories.tag_repository import TagRepository

router = APIRouter()


@router.get("/")
async def list_tags(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TagRepository(db).get_all()


@router.delete("/cleanup", status_code=status.HTTP_200_OK)
async def cleanup_orphan_tags(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Удаляет все теги, которые не привязаны ни к одной статье (сиротские теги).
    Доступно только администраторам.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только администратор может запускать очистку базы.",
        )

    # Ищем теги, чьих ID нет в сводной таблице article_tags, и удаляем их
    sql = """
        DELETE FROM tags 
        WHERE id NOT IN (SELECT DISTINCT tag_id FROM article_tags);
    """

    result = await db.execute(text(sql))
    await db.commit()

    # Безопасно получаем rowcount, чтобы Pylance не ругался
    deleted_count = getattr(result, "rowcount", 0)

    return {
        "status": "success",
        "message": "Очистка завершена",
        "deleted_count": deleted_count,
    }
