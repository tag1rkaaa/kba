import re
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Category, CategoryClosure


def slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    return re.sub(r"^-+|-+$", "", slug)


class CategoryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Category]:
        result = await self.db.execute(
            select(Category).order_by(Category.sort_order, Category.name)
        )
        return list(result.scalars().all())

    async def get_by_id(self, category_id: int) -> Category | None:
        result = await self.db.execute(select(Category).where(Category.id == category_id))
        return result.scalar_one_or_none()

    async def create(self, name: str, parent_id: int | None, sort_order: int) -> Category:
        category = Category(
            name=name,
            slug=slugify(name),
            parent_id=parent_id,
            sort_order=sort_order,
        )
        self.db.add(category)
        await self.db.flush()  # получаем id без commit

        # Closure Table: добавляем запись сам-на-себя
        self.db.add(
            CategoryClosure(
                ancestor_id=category.id,
                descendant_id=category.id,
                depth=0,
            )
        )

        # Копируем все записи предков из родителя
        if parent_id:
            result = await self.db.execute(
                select(CategoryClosure).where(CategoryClosure.descendant_id == parent_id)
            )
            for row in result.scalars().all():
                self.db.add(
                    CategoryClosure(
                        ancestor_id=row.ancestor_id,
                        descendant_id=category.id,
                        depth=row.depth + 1,
                    )
                )

        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def get_children(self, category_id: int) -> list[Category]:
        result = await self.db.execute(
            select(Category)
            .join(CategoryClosure, CategoryClosure.descendant_id == Category.id)
            .where(
                CategoryClosure.ancestor_id == category_id,
                CategoryClosure.depth == 1,
            )
            .order_by(Category.sort_order)
        )
        return list(result.scalars().all())

    async def get_breadcrumbs(self, category_id: int) -> list[Category]:
        result = await self.db.execute(
            select(Category)
            .join(CategoryClosure, CategoryClosure.ancestor_id == Category.id)
            .where(CategoryClosure.descendant_id == category_id)
            .order_by(CategoryClosure.depth.desc())
        )
        return list(result.scalars().all())

    async def delete(self, category_id: int) -> None:
        # Удаляем все closure записи
        await self.db.execute(
            delete(CategoryClosure).where(CategoryClosure.descendant_id == category_id)
        )
        await self.db.execute(delete(Category).where(Category.id == category_id))
        await self.db.commit()
