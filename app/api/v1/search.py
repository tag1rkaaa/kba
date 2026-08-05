from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.models.models import User
from app.schemas.search import SearchResponse
from app.services.search_service import SearchService

router = APIRouter()


@router.get("/", response_model=SearchResponse)
async def search(
    q: str,
    mode: str = "fulltext",
    category_id: Optional[int] = None,
    tags: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tag_list = tags.split(",") if tags else None
    return await SearchService(db).search(
        q=q,
        mode=mode,
        category_id=category_id,
        tags=tag_list,
        limit=limit,
        offset=offset,
    )
