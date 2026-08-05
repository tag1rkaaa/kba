from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create(
        self, email: str, password_hash: str, role: str = "viewer", is_active: bool = False
    ) -> User:
        user = User(email=email, password_hash=password_hash, role=role, is_active=is_active)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def get_pending(self) -> list[User]:
        result = await self.db.execute(select(User).where(User.is_active.is_(False)))
        return list(result.scalars().all())

    async def approve(self, user_id: int) -> User:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        user.is_active = True
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def reject(self, user_id: int) -> None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        await self.db.delete(user)
        await self.db.commit()
