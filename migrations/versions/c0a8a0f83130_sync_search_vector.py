"""sync_search_vector

Revision ID: c0a8a0f83130
Revises: bf5d6327b710
Create Date: 2026-08-20 14:29:34.440460

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c0a8a0f83130"
down_revision: Union[str, Sequence[str], None] = "bf5d6327b710"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
