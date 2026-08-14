from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_role
from app.core.security import hash_password
from app.models.models import AuditLog, ResetRequest, User
from app.schemas.auth import PasswordResetRequest, UserOut

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/pending", response_model=list[UserOut])
async def get_pending(
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("admin"),
):
    from app.repositories.user_repository import UserRepository

    return await UserRepository(db).get_pending()


@router.get("/", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("moderator", "admin"),
):
    result = await db.execute(select(User).where(User.is_active.is_(True)))
    return result.scalars().all()


@router.post("/{user_id}/approve", response_model=UserOut)
async def approve_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("admin"),
):
    from app.repositories.user_repository import UserRepository

    return await UserRepository(db).approve(user_id)


@router.post("/{user_id}/reject", status_code=204)
async def reject_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("admin"),
):
    from app.repositories.user_repository import UserRepository

    await UserRepository(db).reject(user_id)


@router.patch("/{user_id}/role")
async def set_role(
    user_id: int,
    role: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("admin"),
):
    if role not in ("viewer", "editor", "moderator", "admin"):
        raise HTTPException(status_code=400, detail="Недопустимая роль")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.role = role
    await db.commit()
    return {"id": user.id, "email": user.email, "role": user.role}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("admin"),
):
    """Удаление (деактивация) пользователя"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")

    user.is_active = False
    await db.commit()
    return


class PasswordReset(BaseModel):
    new_password: str


@router.post("/{user_id}/reset-password", status_code=200)
async def reset_password(
    user_id: int,
    payload: PasswordReset,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("moderator", "admin"),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return {"status": "ok", "message": f"Пароль пользователя {user.email} обновлён"}


# ==========================================
# ЭНДПОИНТЫ ДЛЯ ЗАЯВОК НА СБРОС ПАРОЛЯ
# ==========================================


@router.post("/request-password-reset")
async def request_password_reset(
    request_data: PasswordResetRequest, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == request_data.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь с таким email не найден"
        )

    existing_req = await db.execute(select(ResetRequest).where(ResetRequest.user_id == user.id))
    if existing_req.scalar_one_or_none():
        return {"message": "Заявка уже отправлена, ожидайте."}

    new_request = ResetRequest(user_id=user.id, email=user.email)
    db.add(new_request)
    await db.commit()

    return {"message": "Заявка успешно отправлена"}


@router.get("/reset-requests")
async def get_reset_requests(
    db: AsyncSession = Depends(get_db), current_user: User = require_role("moderator", "admin")
):
    result = await db.execute(select(ResetRequest).order_by(ResetRequest.created_at.desc()))
    return result.scalars().all()


class ResolveResetRequest(BaseModel):
    user_id: int
    new_password: str


@router.post("/reset-requests/{request_id}/resolve")
async def resolve_reset_request(
    request_id: int,
    payload: ResolveResetRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("moderator", "admin"),
):
    req_result = await db.execute(select(ResetRequest).where(ResetRequest.id == request_id))
    reset_req = req_result.scalar_one_or_none()
    if not reset_req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    user_result = await db.execute(select(User).where(User.id == payload.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.password_hash = hash_password(payload.new_password)

    await db.delete(reset_req)
    await db.commit()

    return {"status": "ok", "message": "Пароль обновлен, заявка закрыта"}


@router.delete("/reset-requests/{request_id}", status_code=204)
async def dismiss_reset_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("moderator", "admin"),
):
    req_result = await db.execute(select(ResetRequest).where(ResetRequest.id == request_id))
    reset_req = req_result.scalar_one_or_none()

    if not reset_req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    await db.delete(reset_req)
    await db.commit()
    return


# ==========================================
# АУДИТ И ЛОГИРОВАНИЕ
# ==========================================


@router.get("/audit-log")
async def get_audit_log(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_role("admin", "moderator"),
):
    result = await db.execute(
        select(AuditLog, User)
        .join(User, AuditLog.user_id == User.id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    rows = result.all()
    return [
        {
            "id": row.AuditLog.id,
            "user_email": row.User.email,
            "action": row.AuditLog.action,
            "entity_type": row.AuditLog.entity_type,
            "entity_id": row.AuditLog.entity_id,
            "diff": row.AuditLog.diff,
            "created_at": row.AuditLog.created_at,
        }
        for row in rows
    ]
