import os

class Config:
    # API Gateway Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here')
    DEBUG = os.environ.get('FLASK_ENV', 'development') == 'development'

    # Service URLs
    USER_MANAGEMENT_SERVICE_URL = os.environ.get('USER_SERVICE_URL', 'http://user-management-service:8081')
    EXERCISES_SERVICE_URL = os.environ.get('EXERCISES_SERVICE_URL', 'http://exercises-service:8082')
    SCORES_SERVICE_URL = os.environ.get('SCORES_SERVICE_URL', 'http://scores-service:8083')

    # CORS Configuration - Parse from env or use defaults
    # Supports exact URLs and regex patterns (prefix with "pattern:")
    # Example: http://localhost:3000,pattern:https?://.*\.elb\.amazonaws\.com
    @staticmethod
    def get_cors_origins():
        origins_env = os.environ.get("CORS_ORIGINS")
        if origins_env:
            return [o.strip() for o in origins_env.split(",") if o.strip()]
        return ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://localhost:31184", "http://127.0.0.1:31184"]

    CORS_ORIGINS = get_cors_origins.__func__()
    
    # Rate limiting (requests per minute)
    RATE_LIMIT_PER_MINUTE = int(os.environ.get('RATE_LIMIT_PER_MINUTE', '100'))
    
    # Request timeout (seconds)
    REQUEST_TIMEOUT = int(os.environ.get('REQUEST_TIMEOUT', '30'))