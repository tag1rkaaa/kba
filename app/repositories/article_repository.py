from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Article, ArticleRevision


class ArticleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self, skip: int = 0, limit: int = 20, source: str | None = None
    ) -> list[Article]:
        query = (
            select(Article)
            .options(selectinload(Article.tags))
            .where(Article.status != "archived")
            .offset(skip)
            .limit(limit)
            .order_by(Article.updated_at.desc())
        )
        if source:
            query = query.where(Article.source == source)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, article_id: int) -> Article | None:
        result = await self.db.execute(
            select(Article).options(selectinload(Article.tags)).where(Article.id == article_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Article | None:
        result = await self.db.execute(select(Article).where(Article.slug == slug))
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> Article:
        article = Article(**data)
        self.db.add(article)
        await self.db.commit()
        await self.db.refresh(article)
        return article

    async def update(self, article: Article, data: dict) -> Article:
        for key, value in data.items():
            setattr(article, key, value)
        await self.db.commit()
        await self.db.refresh(article)
        return article

    async def save_revision(self, article: Article, editor_id: int) -> ArticleRevision:
        revision = ArticleRevision(
            article_id=article.id,
            content=article.content,
            author_id=editor_id,
            version=article.version,
        )
        self.db.add(revision)
        await self.db.commit()
        return revision

    async def get_revisions(self, article_id: int) -> list[ArticleRevision]:
        result = await self.db.execute(
            select(ArticleRevision)
            .where(ArticleRevision.article_id == article_id)
            .order_by(ArticleRevision.version.desc())
        )
        return list(result.scalars().all())

    async def get_revision(self, revision_id: int) -> ArticleRevision | None:
        result = await self.db.execute(
            select(ArticleRevision).where(ArticleRevision.id == revision_id)
        )
        return result.scalar_one_or_none()
