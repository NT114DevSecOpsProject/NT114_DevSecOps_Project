from pydantic import BaseModel, EmailStr, Field

class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=128)
    email: EmailStr
    password: str = Field(min_length=6)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    active: bool
    admin: bool
    role: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class CreateUserIn(BaseModel):
    username: str
    email: EmailStr
    password: str
    admin: bool = False
    active: bool = True
    role: str = "student"
