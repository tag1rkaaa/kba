from datetime import datetime, timedelta
from pathlib import Path
import bcrypt

from jose import jwt

from app.core.config import settings


def _read_key(path: str) -> bytes:
    return Path(path).read_bytes()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_TTL_MINUTES)
    payload = {"sub": subject, "exp": expire, "type": "access"}
    return jwt.encode(
        payload, _read_key(settings.SECRET_KEY_PRIVATE_FILE), algorithm="RS256"
    )


def create_refresh_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
    payload = {"sub": subject, "exp": expire, "type": "refresh"}
    return jwt.encode(
        payload, _read_key(settings.SECRET_KEY_PRIVATE_FILE), algorithm="RS256"
    )


def decode_token(token: str) -> dict:
    return jwt.decode(
        token, _read_key(settings.SECRET_KEY_PUBLIC_FILE), algorithms=["RS256"]
    )
