from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.models.models import User
from app.repositories.tag_repository import TagRepository

router = APIRouter()


@router.get("/")
async def list_tags(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TagRepository(db).get_all()
