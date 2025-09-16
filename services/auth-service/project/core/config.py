from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "auth-service"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    DATABASE_URL: str

    JWT_ALG: str = "HS256"
    JWT_SECRET: str = "devsecret"
    JWT_AUDIENCE: str = "e-learning"
    JWT_ISSUER: str = "auth-service"

    CORS_ORIGINS: str = "*"

    class Config:
        env_file = ".env"

settings = Settings()
