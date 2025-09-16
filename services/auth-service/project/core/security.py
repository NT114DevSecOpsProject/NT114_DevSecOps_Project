from datetime import datetime, timedelta
from typing import Any, Dict
import jwt
from passlib.hash import bcrypt
from .config import settings

def hash_password(raw: str) -> str:
    return bcrypt.hash(raw)

def verify_password(raw: str, hashed: str) -> bool:
    return bcrypt.verify(raw, hashed)

def create_access_token(sub: str, role: str = "student", extra: Dict[str, Any] | None = None) -> str:
    payload = {
        "sub": sub,
        "role": role,
        "aud": settings.JWT_AUDIENCE,
        "iss": settings.JWT_ISSUER,
        "exp": datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRES_MIN),
        **(extra or {}),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)

def verify_token(token: str) -> Dict[str, Any]:
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALG],
        audience=settings.JWT_AUDIENCE,
        options={"require": ["exp", "iss", "aud", "sub"]},
    )
