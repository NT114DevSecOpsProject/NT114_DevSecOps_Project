import logging
from functools import wraps
from flask import request, jsonify, g
from services import UserManagementServiceClient

logger = logging.getLogger(__name__)

AUTH_TOKEN_REQUIRED_MSG = "Authentication token is required"
INVALID_TOKEN_MSG = "Invalid or expired token"
ADMIN_REQUIRED_MSG = "Admin privileges required"

class AuthMiddleware:
    """Authentication middleware"""
    
    def __init__(self, user_management_client: UserManagementServiceClient):
        self.user_management_client = user_management_client
    
    def extract_token_from_header(self) -> str:
        """Extract token from Authorization header"""
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return ""
        try:
            return auth_header.split(' ')[1]
        except IndexError:
            return ""
    
    def verify_token(self, token: str) -> dict:
        """Verify token with user management service"""
        response, status_code = self.user_management_client.verify_token(token)
        if status_code == 200 and response.get('status') == 'success':
            return response.get('data')
        return {}

    def _get_user_data(self):
        token = self.extract_token_from_header()
        if not token:
            return None, jsonify({"status": "fail", "message": AUTH_TOKEN_REQUIRED_MSG}), 401
        user_data = self.verify_token(token)
        if not user_data:
            return None, jsonify({"status": "fail", "message": INVALID_TOKEN_MSG}), 401
        return user_data, None, None

def require_auth(auth_middleware: AuthMiddleware):
    """Decorator to require authentication"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_data, error_response, error_code = auth_middleware._get_user_data()
            if error_response:
                return error_response, error_code
            g.current_user = user_data
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_admin(auth_middleware: AuthMiddleware):
    """Decorator to require admin privileges"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_data, error_response, error_code = auth_middleware._get_user_data()
            if error_response:
                return error_response, error_code
            if not user_data.get('admin'):
                logger.warning(f"User {user_data.get('username', 'unknown')} attempted admin action without privileges")
                return jsonify({"status": "fail", "message": ADMIN_REQUIRED_MSG}), 403
            g.current_user = user_data
            return f(*args, **kwargs)
        return decorated_function
    return decorator

class RequestLoggingMiddleware:
    """Request logging middleware"""
    
    @staticmethod
    def log_request():
        """Log incoming request"""
        logger.info(f"{request.method} {request.path} - {request.remote_addr}")
        if request.method in ['POST', 'PUT'] and request.is_json:
            data = request.get_json() or {}
            safe_data = {k: "***" if k.lower() in ['password', 'token'] else v 
                        for k, v in data.items()}
            logger.debug(f"Request data: {safe_data}")
    
    @staticmethod
    def log_response(response):
        """Log response"""
        logger.info(f"{request.method} {request.path} - Response: {response.status_code}")
        return response