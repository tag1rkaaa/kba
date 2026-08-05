"""add_source_to_articles

Revision ID: 9ebbdb70da12
Revises: 6a66702d5247
Create Date: 2026-07-29 14:10:49.711147

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TSVECTOR

revision: str = "9ebbdb70da12"
down_revision: Union[str, Sequence[str], None] = "6a66702d5247"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем колонку source
    op.add_column("articles", sa.Column("source", sa.String(length=255), nullable=True))

    # Добавляем search_vector если не существует
    op.execute("""
        ALTER TABLE articles
        ADD COLUMN IF NOT EXISTS search_vector tsvector
    """)

    # Создаём индекс если не существует
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_articles_search
        ON articles USING GIN(search_vector)
    """)


def downgrade() -> None:
    op.drop_column("articles", "source")
    op.execute("DROP INDEX IF EXISTS idx_articles_search")
    op.execute("ALTER TABLE articles DROP COLUMN IF EXISTS search_vector")
