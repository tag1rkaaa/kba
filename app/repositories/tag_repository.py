import re
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Tag


def slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    return re.sub(r"^-+|-+$", "", slug)


class TagRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create(self, name: str) -> Tag:
        slug = slugify(name)
        result = await self.db.execute(select(Tag).where(Tag.slug == slug))
        tag = result.scalar_one_or_none()
        if not tag:
            tag = Tag(name=name.lower(), slug=slug)
            self.db.add(tag)
            await self.db.flush()
        return tag

    async def get_all(self) -> list[Tag]:
        result = await self.db.execute(select(Tag).order_by(Tag.name))
        return list(result.scalars().all())
