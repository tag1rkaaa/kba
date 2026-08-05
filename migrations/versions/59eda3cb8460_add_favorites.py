"""add_favorites

Revision ID: 59eda3cb8460
Revises: 3caa62dff1c2
Create Date: 2026-07-31 16:00:41.526937

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "59eda3cb8460"
down_revision: Union[str, Sequence[str], None] = "3caa62dff1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "favorites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["article_id"], ["articles.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("favorites")
