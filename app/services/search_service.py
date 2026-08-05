import time
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.search import SearchResponse, SearchHit


class SearchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(
        self,
        q: str,
        mode: str = "hybrid",
        category_id: int | None = None,
        tags: list[str] | None = None,
        space_id: int | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> SearchResponse:
        t0 = time.monotonic()

        if not q.strip():
            return SearchResponse(hits=[], total_count=0, time_ms=0.0, search_mode=mode)

        if mode == "vector":
            hits = await self._vector_search(q, category_id, limit, offset)
        elif mode == "fulltext":
            hits = await self._fulltext_search(q, category_id, tags, limit, offset)
            if not hits:
                hits = await self._ilike_search(q, limit, offset, category_id)
        else:
            # hybrid — объединяем FTS и vector через RRF
            hits = await self._hybrid_search(q, category_id, tags, limit, offset)

        return SearchResponse(
            hits=hits,
            total_count=len(hits),
            time_ms=round((time.monotonic() - t0) * 1000, 2),
            search_mode=mode,
        )

    async def _fulltext_search(
        self,
        q: str,
        category_id: int | None,
        tags: list[str] | None,
        limit: int,
        offset: int,
    ) -> list[SearchHit]:
        ts_query_str = " & ".join([f"{word}:*" for word in q.split()])

        sql = """
            SELECT
                a.id,
                a.title,
                a.slug,
                a.author_id,
                a.created_at,
                ts_rank_cd(a.search_vector, to_tsquery('russian', :ts_q)) AS score,
                ts_headline(
                    'russian',
                    COALESCE(a.description, '') || ' ... ' || COALESCE(a.content_plain, ''),
                    to_tsquery('russian', :ts_q),
                    'StartSel=<b>, StopSel=</b>, MaxWords=30, MinWords=10, ShortWord=3, MaxFragments=2, FragmentDelimiter=" ... "'
                ) AS excerpt
            FROM articles a
            WHERE (
                a.search_vector @@ to_tsquery('russian', :ts_q)
                OR to_tsvector('russian', COALESCE(a.description, '')) @@ to_tsquery('russian', :ts_q)
                OR CAST(a.number AS TEXT) = :q_exact
            )
              AND a.status = 'published'
        """

        params: dict = {
            "ts_q": ts_query_str,
            "q_exact": q.replace("#", "").strip().lstrip("0") or q.strip(),
            "limit": limit,
            "offset": offset,
        }

        if category_id:
            sql += " AND a.category_id = :category_id"
            params["category_id"] = category_id

        if tags:
            sql += """
                AND EXISTS (
                    SELECT 1 FROM article_tags at2
                    JOIN tags t ON t.id = at2.tag_id
                    WHERE at2.article_id = a.id
                    AND t.slug = ANY(:tags)
                )
            """
            params["tags"] = tags

        sql += " ORDER BY score DESC LIMIT :limit OFFSET :offset"
        result = await self.db.execute(text(sql), params)
        rows = result.fetchall()

        return [
            SearchHit(
                id=row.id,
                title=row.title,
                slug=row.slug,
                excerpt=row.excerpt or "",
                score=float(row.score),
                matched_tags=[],
                author_id=row.author_id,
                created_at=row.created_at,
            )
            for row in rows
        ]

    async def _vector_search(
        self,
        q: str,
        category_id: int | None,
        limit: int,
        offset: int,
    ) -> list[SearchHit]:
        """Семантический поиск через pgvector."""
        from app.services.embeddings import generate_embedding

        vector = generate_embedding(q)
        if not vector:
            return []

        sql = """
            SELECT
                a.id,
                a.title,
                a.slug,
                a.author_id,
                a.created_at,
                1 - (a.embedding <=> :vector::vector) AS score,
                COALESCE(a.description, a.content_plain) AS excerpt
            FROM articles a
            WHERE a.embedding IS NOT NULL
              AND a.status = 'published'
        """
        params: dict = {
            "vector": str(vector),
            "limit": limit,
            "offset": offset,
        }

        if category_id:
            sql += " AND a.category_id = :category_id"
            params["category_id"] = category_id

        sql += " ORDER BY a.embedding <=> :vector::vector LIMIT :limit OFFSET :offset"

        result = await self.db.execute(text(sql), params)
        rows = result.fetchall()

        return [
            SearchHit(
                id=row.id,
                title=row.title,
                slug=row.slug,
                excerpt=row.excerpt[:200] + "..." if len(row.excerpt) > 200 else row.excerpt,
                score=float(row.score),
                matched_tags=[],
                author_id=row.author_id,
                created_at=row.created_at,
            )
            for row in rows
        ]

    async def _ilike_search(
        self, q: str, limit: int | None = 20, offset: int | None = 0, category_id: int | None = None
    ):
        """Поиск через ILIKE с поддержкой номера статьи."""
        sql = """
            SELECT 
                a.id, 
                a.title, 
                a.slug, 
                a.author_id, 
                a.created_at, 
                1.0 AS score, 
                COALESCE(a.description, a.content_plain) AS excerpt 
            FROM articles a 
            WHERE (
                a.title ILIKE :q 
                OR a.description ILIKE :q
                OR a.content_plain ILIKE :q 
                OR CAST(a.number AS TEXT) = :q_exact
            ) 
            AND a.status = 'published'
        """

        params: dict = {
            "q": f"%{q}%",
            "q_exact": q.strip().lstrip("0") or q.strip(),
            "limit": limit,
            "offset": offset,
        }

        if category_id is not None:
            sql += " AND a.category_id = :category_id"
            params["category_id"] = category_id

        sql += " ORDER BY a.created_at DESC LIMIT :limit OFFSET :offset"

        result = await self.db.execute(text(sql), params)
        rows = result.fetchall()

        return [
            SearchHit(
                id=row.id,
                title=row.title,
                slug=row.slug,
                author_id=row.author_id,
                created_at=row.created_at,
                score=row.score,
                excerpt=row.excerpt[:200] + "..." if len(row.excerpt) > 200 else row.excerpt,
                matched_tags=[],
            )
            for row in rows
        ]

    async def _hybrid_search(
        self,
        q: str,
        category_id: int | None,
        tags: list[str] | None,
        limit: int,
        offset: int,
    ) -> list[SearchHit]:
        """RRF — объединяет FTS и vector поиск."""
        fts_hits = await self._fulltext_search(q, category_id, tags, limit * 2, 0)
        vector_hits = await self._vector_search(q, category_id, limit * 2, 0)

        # Если vector пустой — fallback на ilike
        if not fts_hits and not vector_hits:
            return await self._ilike_search(q, limit * 2, 0, category_id)

        return self._reciprocal_rank_fusion(fts_hits, vector_hits, k=60)[:limit]

    @staticmethod
    def _reciprocal_rank_fusion(
        list_a: list[SearchHit],
        list_b: list[SearchHit],
        k: int = 60,
    ) -> list[SearchHit]:
        scores: dict[int, float] = {}
        index: dict[int, SearchHit] = {}

        for rank, hit in enumerate(list_a):
            scores[hit.id] = scores.get(hit.id, 0) + 1 / (rank + k)
            index[hit.id] = hit

        for rank, hit in enumerate(list_b):
            scores[hit.id] = scores.get(hit.id, 0) + 1 / (rank + k)
            index[hit.id] = hit

        sorted_ids = sorted(scores, key=lambda x: scores[x], reverse=True)
        return [index[i] for i in sorted_ids]
