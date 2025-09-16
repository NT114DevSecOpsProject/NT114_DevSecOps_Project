from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from ...db.session import get_db, engine
from ...models.user import User
from ...schemas.users import RegisterIn, LoginIn, TokenOut, UserOut
from ...core.security import hash_password, verify_password, create_access_token

# create tables if not exist (dev convenience)
from ...db.base import Base
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/v1/auth", tags=["auth"])

@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    exists = db.execute(select(User).where(or_(User.email == payload.email, User.username == payload.username))).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="User already exists")
    user = User(username=payload.username, email=payload.email, password_hash=hash_password(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    token = create_access_token(str(user.id), role=user.role)
    return TokenOut(access_token=token)

@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")
    if not user.active:
        raise HTTPException(status_code=401, detail="User account is inactive")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(str(user.id), role=user.role)
    return TokenOut(access_token=token)

@router.get("/me", response_model=UserOut)
def me(claims: dict = Depends(...)):
    # reuse current_claims via dependency override in main
    return claims["user"]  # sẽ được gán ở main thông qua dependency wrapper
