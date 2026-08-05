from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_role
from app.models.models import User
from app.schemas.category import BreadcrumbItem, CategoryCreate, CategoryOut
from app.services.category_service import CategoryService

router = APIRouter()


@router.get("/", response_model=list[CategoryOut])
async def get_tree(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CategoryService(db).get_tree()


@router.post("/", response_model=CategoryOut, status_code=201)
async def create_category(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("admin", "moderator"),
):
    return await CategoryService(db).create(
        name=payload.name,
        parent_id=payload.parent_id,
        sort_order=payload.sort_order,
    )


@router.get("/{category_id}/breadcrumbs", response_model=list[BreadcrumbItem])
async def get_breadcrumbs(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CategoryService(db).get_breadcrumbs(category_id)


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("admin"),
):
    await CategoryService(db).delete(category_id)
