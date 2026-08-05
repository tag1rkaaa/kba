from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TagOut(BaseModel):
    id: int
    name: str
    slug: str
    model_config = {"from_attributes": True}


class ArticleCreate(BaseModel):
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    content: dict = Field(...)
    category_id: Optional[int] = None
    tags: list[str] = []
    status: str = "draft"


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[dict] = None
    category_id: Optional[int] = None
    tags: Optional[list[str]] = None
    status: Optional[str] = None


class ArticleOut(BaseModel):
    id: int
    number: Optional[int] = None
    title: str
    slug: str
    description: Optional[str] = None
    status: str
    version: int
    category_id: Optional[int] = None
    author_id: int
    source: Optional[str] = None
    tags: list[TagOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ArticleDetail(ArticleOut):
    content: dict
