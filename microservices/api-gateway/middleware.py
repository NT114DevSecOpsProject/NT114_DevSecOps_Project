import jwt
import logging
from functools import wraps
from flask import request, jsonify, g
from services import UserManagementServiceClient

logger = logging.getLogger(__name__)

class AuthMiddleware:
    """Authentication middleware"""
    
    def __init__(self, user_management_client: UserManagementServiceClient):
        self.user_management_client = user_management_client
    
    def extract_token_from_header(self) -> str:
        """Extract token from Authorization header"""
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None
        
        try:
            return auth_header.split(' ')[1]
        except IndexError:
            return None
    
    def verify_token(self, token: str) -> dict:
        """Verify token with user management service"""
        response, status_code = self.user_management_client.verify_token(token)
        
        if status_code == 200 and response.get('status') == 'success':
            return response.get('data')
        
        return None

def require_auth(auth_middleware: AuthMiddleware):
    """Decorator to require authentication"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Extract token
            token = auth_middleware.extract_token_from_header()
            if not token:
                return jsonify({
                    "status": "fail",
                    "message": "Authentication token is required"
                }), 401
            
            # Verify token
            user_data = auth_middleware.verify_token(token)
            if not user_data:
                return jsonify({
                    "status": "fail", 
                    "message": "Invalid or expired token"
                }), 401
            
            # Store user data in g for access in route handlers
            g.current_user = user_data
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_admin(auth_middleware: AuthMiddleware):
    """Decorator to require admin privileges"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # First check authentication
            token = auth_middleware.extract_token_from_header()
            if not token:
                return jsonify({
                    "status": "fail",
                    "message": "Authentication token is required"
                }), 401
            
            # Verify token
            user_data = auth_middleware.verify_token(token)
            if not user_data:
                return jsonify({
                    "status": "fail",
                    "message": "Invalid or expired token"
                }), 401
            
            # Check admin privileges
            logger.info(f"User data for admin check: {user_data}")
            if not user_data.get('admin'):
                logger.warning(f"User {user_data.get('username', 'unknown')} attempted admin action without privileges")
                return jsonify({
                    "status": "fail",
                    "message": "Admin privileges required"
                }), 403
            
            # Store user data in g for access in route handlers
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
        
        # Log request data for POST/PUT requests
        if request.method in ['POST', 'PUT'] and request.is_json:
            # Don't log sensitive data like passwords
            data = request.get_json() or {}
            safe_data = {k: "***" if k.lower() in ['password', 'token'] else v 
                        for k, v in data.items()}
            logger.debug(f"Request data: {safe_data}")
    
    @staticmethod
    def log_response(response):
        """Log response"""
        logger.info(f"{request.method} {request.path} - Response: {response.status_code}")
        return response