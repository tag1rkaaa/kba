from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import AuditLog


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        user_id: int,
        action: str,
        entity_type: str,
        entity_id: int,
        diff: dict = {},
    ):
        entry = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            diff=diff,
        )
        self.db.add(entry)
        await self.db.commit()
