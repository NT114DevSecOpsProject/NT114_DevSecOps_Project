from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .api.routes import auth as auth_routes
from .api.routes import users as users_routes
from .api.deps import current_claims

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

# expose claims into auth/me route without duplicating code
@app.get("/v1/auth/me")
def auth_me(claims: dict = Depends(current_claims)):
    return {"id": int(claims["sub"]), "username": "", "email": "", "active": True, "admin": claims.get("role") == "admin", "role": claims.get("role", "student")}

app.include_router(auth_routes.router)
app.include_router(users_routes.router)
