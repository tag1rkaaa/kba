from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", status_code=201)
async def register(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await AuthService(db).register(payload.email, payload.password)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await AuthService(db).login(payload.email, payload.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await AuthService(db).refresh(payload.refresh_token)


@router.post("/logout", status_code=204)
async def logout():
    # TODO: инвалидировать refresh token в Redis
    pass
