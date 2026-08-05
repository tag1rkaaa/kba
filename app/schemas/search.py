from datetime import datetime
from pydantic import BaseModel


class SearchHit(BaseModel):
    id: int
    title: str
    slug: str
    excerpt: str
    score: float
    matched_tags: list[str]
    author_id: int
    created_at: datetime


class SearchResponse(BaseModel):
    hits: list[SearchHit]
    total_count: int
    time_ms: float
    search_mode: str
