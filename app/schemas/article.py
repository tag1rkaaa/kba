from datetime import datetime

from pydantic import BaseModel, Field


class TagOut(BaseModel):
    id: int
    name: str
    slug: str
    model_config = {"from_attributes": True}


class ArticleCreate(BaseModel):
    title: str = Field(..., max_length=500)
    description: str | None = None
    content: dict = Field(...)
    category_id: int | None = None
    tags: list[str] = []
    status: str = "draft"


class ArticleUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    content: dict | None = None
    category_id: int | None = None
    tags: list[str] | None = None
    status: str | None = None


class ArticleOut(BaseModel):
    id: int
    number: int | None = None
    title: str
    slug: str
    description: str | None = None
    status: str
    version: int
    category_id: int | None = None
    author_id: int
    source: str | None = None
    tags: list[TagOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ArticleDetail(ArticleOut):
    content: dict
