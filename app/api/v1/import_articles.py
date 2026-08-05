import csv
import io
import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_role
from app.models.models import Article, User
from app.services.article_service import slugify

router = APIRouter()


@router.post("/json")
async def import_from_json(
    file: UploadFile = File(...),
    category_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("admin", "moderator"),
):
    """
    Формат JSON:
    [
      {
        "title": "Название статьи",
        "content": "Текст статьи",
        "source": "МФЦ",
        "tags": ["тег1", "тег2"]
      }
    ]
    """
    if not (file.filename or "").endswith(".json"):
        raise HTTPException(status_code=400, detail="Нужен .json файл")

    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Невалидный JSON")

    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail="JSON должен быть массивом")

    imported = []
    errors = []

    for i, item in enumerate(data):
        try:
            title = item.get("title", "").strip()
            text = item.get("content", "").strip()
            source = item.get("source", "").strip() or None

            if not title:
                errors.append(f"Строка {i + 1}: нет заголовка")
                continue

            # Формируем TipTap JSON из plain text
            content_json = {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": p}]}
                    for p in text.split("\n")
                    if p.strip()
                ]
                or [{"type": "paragraph"}],
            }

            slug = slugify(title)
            # Проверяем уникальность slug
            from sqlalchemy import select

            existing = await db.execute(select(Article).where(Article.slug == slug))
            if existing.scalar_one_or_none():
                import time

                slug = f"{slug}-{int(time.time())}"

            article = Article(
                title=title,
                slug=slug,
                content=content_json,
                content_plain=text,
                source=source,
                category_id=category_id,  # ← добавь эту строку
                status="published",
                author_id=current_user.id,
                version=1,
            )
            db.add(article)
            imported.append(title)

        except Exception as e:
            errors.append(f"Строка {i + 1}: {e!s}")

    await db.commit()

    return {
        "imported": len(imported),
        "errors": errors,
        "titles": imported,
    }


@router.post("/csv")
async def import_from_csv(
    file: UploadFile = File(...),
    category_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("admin", "moderator"),
):
    """
    Формат CSV (заголовок обязателен):
    title,content,source,tags
    "Название","Текст статьи","МФЦ","тег1;тег2"
    """
    if not (file.filename or "").endswith(".csv"):
        raise HTTPException(status_code=400, detail="Нужен .csv файл")

    content = await file.read()
    text = content.decode("utf-8-sig")  # utf-8-sig убирает BOM от Excel
    reader = csv.DictReader(io.StringIO(text))

    if not {"title", "content"}.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail="CSV должен содержать колонки: title, content (и опционально: source, tags)",
        )

    imported = []
    errors = []

    for i, row in enumerate(reader):
        try:
            title = row.get("title", "").strip()
            text = row.get("content", "").strip()
            source = row.get("source", "").strip() or None

            if not title:
                errors.append(f"Строка {i + 2}: нет заголовка")
                continue

            content_json = {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": p}]}
                    for p in text.split("\n")
                    if p.strip()
                ]
                or [{"type": "paragraph"}],
            }

            slug = slugify(title)
            from sqlalchemy import select

            existing = await db.execute(select(Article).where(Article.slug == slug))
            if existing.scalar_one_or_none():
                import time

                slug = f"{slug}-{int(time.time())}"

            article = Article(
                title=title,
                slug=slug,
                content=content_json,
                content_plain=text,
                source=source,
                category_id=category_id,  # ← добавь эту строку
                status="published",
                author_id=current_user.id,
                version=1,
            )
            db.add(article)
            imported.append(title)

        except Exception as e:
            errors.append(f"Строка {i + 2}: {e!s}")

    await db.commit()

    return {
        "imported": len(imported),
        "errors": errors,
        "titles": imported,
    }


@router.get("/sources")
async def get_sources(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),  # ← было require_role
):
    """Возвращает список уникальных источников."""
    from sqlalchemy import distinct, select

    result = await db.execute(
        select(distinct(Article.source)).where(Article.source.isnot(None)).order_by(Article.source)
    )
    return [row[0] for row in result.fetchall()]
