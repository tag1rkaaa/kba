from dataclasses import dataclass, field

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Category
from app.repositories.category_repository import CategoryRepository


@dataclass
class CategoryNode:
    id: int
    name: str
    slug: str
    parent_id: int | None
    sort_order: int
    children: list = field(default_factory=list)


class CategoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = CategoryRepository(db)

    async def get_tree(self) -> list[CategoryNode]:
        result = await self.db.execute(
            select(Category).order_by(Category.sort_order, Category.name)
        )
        all_cats = result.scalars().all()

        # Строим дерево из dataclass — без SQLAlchemy объектов
        nodes = {
            c.id: CategoryNode(
                id=c.id,
                name=c.name,
                slug=c.slug,
                parent_id=c.parent_id,
                sort_order=c.sort_order,
            )
            for c in all_cats
        }

        roots = []
        for node in nodes.values():
            if node.parent_id and node.parent_id in nodes:
                nodes[node.parent_id].children.append(node)
            else:
                roots.append(node)

        return roots

    async def create(self, name: str, parent_id: int | None, sort_order: int) -> Category:
        if parent_id:
            parent = await self.repo.get_by_id(parent_id)
            if not parent:
                raise HTTPException(status_code=404, detail="Родительская категория не найдена")
        return await self.repo.create(name, parent_id, sort_order)

    async def get_breadcrumbs(self, category_id: int) -> list[Category]:
        category = await self.repo.get_by_id(category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Категория не найдена")
        return await self.repo.get_breadcrumbs(category_id)

    async def delete(self, category_id: int) -> None:
        category = await self.repo.get_by_id(category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Категория не найдена")
        await self.repo.delete(category_id)
