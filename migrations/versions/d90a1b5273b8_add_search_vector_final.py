"""add search vector final

Revision ID: d90a1b5273b8
Revises: 59eda3cb8460
Create Date: 2026-08-03 11:50:08.245331

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d90a1b5273b8"
down_revision: Union[str, Sequence[str], None] = "59eda3cb8460"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Добавляем генерируемую колонку для поиска и создаем индекс
    op.execute("""
        ALTER TABLE articles 
        ADD COLUMN search_vector tsvector 
        GENERATED ALWAYS AS (
            setweight(to_tsvector('russian', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('russian', coalesce(content_plain, '')), 'B')
        ) STORED;
    """)
    op.execute("""
        CREATE INDEX idx_articles_search_vector ON articles USING GIN (search_vector);
    """)


def downgrade():
    op.execute("DROP INDEX IF EXISTS idx_articles_search_vector;")
    op.execute("ALTER TABLE articles DROP COLUMN IF EXISTS search_vector;")
