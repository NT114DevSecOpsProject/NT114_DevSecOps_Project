from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...models.user import User
from ...schemas.users import UserOut, CreateUserIn
from ..deps import require_admin, current_claims

router = APIRouter(prefix="/v1/users", tags=["users"])

@router.get("/", response_model=list[UserOut], dependencies=[Depends(require_admin)])
def list_users(db: Session = Depends(get_db)):
    return [UserOut(id=u.id, username=u.username, email=u.email, active=u.active, admin=u.admin, role=u.role)
            for u in db.execute(select(User)).scalars().all()]

@router.get("/{user_id}", response_model=UserOut, dependencies=[Depends(require_admin)])
def get_user(user_id: int, db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(id=u.id, username=u.username, email=u.email, active=u.active, admin=u.admin, role=u.role)

@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_user(payload: CreateUserIn, db: Session = Depends(get_db)):
    if db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already exists")
    u = User(username=payload.username, email=payload.email,
             password_hash=hash_password(payload.password),
             admin=payload.admin, active=payload.active, role=payload.role)
    db.add(u); db.commit(); db.refresh(u)
    return UserOut(id=u.id, username=u.username, email=u.email, active=u.active, admin=u.admin, role=u.role)

@router.get("/me", response_model=UserOut)
def me(claims: dict = Depends(current_claims), db: Session = Depends(get_db)):
    u = db.get(User, int(claims["sub"]))
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(id=u.id, username=u.username, email=u.email, active=u.active, admin=u.admin, role=u.role)
