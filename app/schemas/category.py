from typing import Optional
from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(..., max_length=255)
    parent_id: Optional[int] = None
    sort_order: int = 0


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    parent_id: Optional[int] = None
    sort_order: int
    children: list["CategoryOut"] = []

    model_config = {"from_attributes": True}


CategoryOut.model_rebuild()


class BreadcrumbItem(BaseModel):
    id: int
    name: str
    slug: str

    model_config = {"from_attributes": True}
