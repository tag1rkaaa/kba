import re
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Article
from app.repositories.article_repository import ArticleRepository
from app.repositories.tag_repository import TagRepository
from app.schemas.article import ArticleCreate, ArticleUpdate


def slugify(title: str) -> str:
    slug = title.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    slug = re.sub(r"^-+|-+$", "", slug)
    return slug


def extract_plain_text(content: dict) -> str:
    texts = []

    def walk(node: dict):
        if node.get("type") == "text":
            texts.append(node.get("text", ""))
        for child in node.get("content", []):
            walk(child)

    walk(content)
    return " ".join(texts)


class ArticleService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ArticleRepository(db)

    async def list(
        self, skip: int = 0, limit: int = 20, source: str | None = None
    ) -> list[Article]:
        return await self.repo.get_all(skip=skip, limit=limit, source=source)

    async def get_by_id(self, article_id: int) -> Article:
        article = await self.repo.get_by_id(article_id)
        if not article:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Статья не найдена")
        return article

    async def create(self, payload: ArticleCreate, author_id: int) -> Article:
        slug = slugify(payload.title)
        existing = await self.repo.get_by_slug(slug)
        if existing:
            slug = f"{slug}-{int(datetime.utcnow().timestamp())}"

        # Получаем следующий номер из последовательности базы данных
        result = await self.db.execute(text("SELECT nextval('article_number_seq')"))
        number = result.scalar()

        article = await self.repo.create(
            {
                "title": payload.title,
                "slug": slug,
                "content": payload.content,
                "content_plain": extract_plain_text(payload.content),
                "status": payload.status,
                "category_id": payload.category_id,
                "author_id": author_id,
                "version": 1,
                "number": number,
            }
        )

        if payload.tags:
            tag_repo = TagRepository(self.db)
            for tag_name in payload.tags:
                tag = await tag_repo.get_or_create(tag_name)
                if tag not in article.tags:
                    article.tags.append(tag)
            await self.db.commit()
            await self.db.refresh(article)

        return article

    async def update(self, article_id: int, payload: ArticleUpdate, editor_id: int) -> Article:
        article = await self.get_by_id(article_id)
        await self.repo.save_revision(article, editor_id)

        update_data = payload.model_dump(exclude_unset=True)

        # Теги обрабатываем отдельно — не через setattr
        tag_names = update_data.pop("tags", None)

        if "content" in update_data:
            update_data["content_plain"] = extract_plain_text(update_data["content"])

        if "title" in update_data:
            new_slug = slugify(update_data["title"])

            # Проверяем, занят ли слаг КЕМ-ТО ДРУГИМ (не этой же статьей)
            existing = await self.repo.get_by_slug(new_slug)
            if existing and existing.id != article_id:
                new_slug = f"{new_slug}-{int(datetime.utcnow().timestamp())}"

            update_data["slug"] = new_slug

        update_data["version"] = article.version + 1
        update_data["updated_at"] = datetime.utcnow()

        article = await self.repo.update(article, update_data)

        # Обновляем теги отдельно
        if tag_names is not None:
            tag_repo = TagRepository(self.db)
            new_tags = []
            for tag_name in tag_names:
                tag = await tag_repo.get_or_create(tag_name)
                new_tags.append(tag)
            article.tags = new_tags
            await self.db.commit()
            await self.db.refresh(article)

        return article

    async def archive(self, article_id: int) -> None:
        article = await self.get_by_id(article_id)
        await self.repo.update(article, {"status": "archived"})

    async def get_revisions(self, article_id: int) -> list:
        await self.get_by_id(article_id)
        return await self.repo.get_revisions(article_id)

    async def restore_revision(self, article_id: int, revision_id: int, editor_id: int) -> Article:
        article = await self.get_by_id(article_id)
        revision = await self.repo.get_revision(revision_id)

        if not revision or revision.article_id != article_id:
            raise HTTPException(status_code=404, detail="Ревизия не найдена")

        await self.repo.save_revision(article, editor_id)

        return await self.repo.update(
            article,
            {
                "content": revision.content,
                "content_plain": extract_plain_text(revision.content),
                "version": article.version + 1,
                "updated_at": datetime.utcnow(),
            },
        )
