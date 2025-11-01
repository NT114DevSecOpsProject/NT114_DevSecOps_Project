import requests
import logging
from flask import current_app
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

class ServiceClient:
    """Base class for service clients"""
    
    def __init__(self, base_url: str, timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Make HTTP request to service"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            logger.info(f"Making {method} request to {url}")
            
            # Set default timeout
            if 'timeout' not in kwargs:
                kwargs['timeout'] = self.timeout
            
            response = requests.request(method, url, **kwargs)
            
            logger.info(f"Response from {url}: {response.status_code}")
            
            # Try to parse JSON response
            try:
                json_response = response.json()
            except ValueError:
                json_response = {"message": response.text or "No response content"}
            
            return json_response, response.status_code
            
        except requests.exceptions.ConnectionError:
            logger.error(f"Connection error to {url}")
            return {"status": "error", "message": "Service unavailable"}, 503
        except requests.exceptions.Timeout:
            logger.error(f"Timeout error to {url}")
            return {"status": "error", "message": "Service timeout"}, 504
        except Exception as e:
            logger.error(f"Unexpected error calling {url}: {str(e)}")
            return {"status": "error", "message": "Internal gateway error"}, 500

class UserManagementServiceClient(ServiceClient):
    """Client for User Management Service (Auth + Users)"""
    
    def register(self, data: Dict[str, Any]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Register a new user"""
        return self._make_request('POST', '/api/auth/register', json=data)
    
    def login(self, data: Dict[str, Any]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Login user"""
        return self._make_request('POST', '/api/auth/login', json=data)
    
    def logout(self, headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Logout user"""
        return self._make_request('GET', '/api/auth/logout', headers=headers)
    
    def get_user_status(self, headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Get user status"""
        return self._make_request('GET', '/api/auth/status', headers=headers)
    
    def verify_token(self, token: str) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Verify token by checking user status"""
        headers = {"Authorization": f"Bearer {token}"}
        return self.get_user_status(headers)
        #return self._make_request('GET', '/api/auth/status', headers=headers)
    
    # Users API methods
    def get_all_users(self, headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Get all users (admin only)"""
        return self._make_request('GET', '/api/users/', headers=headers)
    
    def get_single_user(self, user_id: int, headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Get single user details"""
        return self._make_request('GET', f'/api/users/{user_id}', headers=headers)
    
    def add_user(self, data: Dict[str, Any], headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Add new user (admin only)"""
        return self._make_request('POST', '/api/users/', json=data, headers=headers)
    
    def admin_create_user(self, data: Dict[str, Any], headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Admin create user with custom flags"""
        return self._make_request('POST', '/api/users/admin_create', json=data, headers=headers)
    
    def health_check(self) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Check user management service health"""
        return self._make_request('GET', '/api/auth/health')


class ExercisesServiceClient(ServiceClient):
    """Client for Exercises Management Service"""
    
    def get_all_exercises(self, headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Get all exercises"""
        return self._make_request('GET', '/api/exercises/', headers=headers)
    
    def get_single_exercise(self, exercise_id: int, headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Get single exercise details"""
        return self._make_request('GET', f'/api/exercises/{exercise_id}', headers=headers)
    
    def create_exercise(self, data: Dict[str, Any], headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Create new exercise (admin only)"""
        return self._make_request('POST', '/api/exercises/', json=data, headers=headers)
        
    def update_exercise(self, exercise_id: int, data: Dict[str, Any], headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Update exercise (admin only)"""
        return self._make_request('PUT', f'/api/exercises/{exercise_id}', json=data, headers=headers)
        
    def delete_exercise(self, exercise_id: int, headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Delete exercise (admin only)"""
        return self._make_request('DELETE', f'/api/exercises/{exercise_id}', headers=headers)
        
    def validate_code(self, data: Dict[str, Any], headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Validate user's code submission"""
        return self._make_request('POST', '/api/exercises/validate_code', json=data, headers=headers)
    
    def health_check(self) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Check exercises service health"""
        try:
            return UserManagementServiceClient.health_check(self)
        except Exception:
            return self._make_request('GET', '/health')


class ScoresServiceClient(ServiceClient):
    """Client for Scores Management Service"""
    
    def get_all_scores(self, headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Get all scores"""
        return self._make_request('GET', '/api/scores/', headers=headers)
    
    def get_scores_by_user(self, headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Get scores by current user"""
        return self._make_request('GET', '/api/scores/user', headers=headers)
    
    def get_single_score_by_user(self, score_id: int, headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Get single score by user"""
        return self._make_request('GET', f'/api/scores/user/{score_id}', headers=headers)
    
    def create_score(self, data: Dict[str, Any], headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Create new score"""
        return self._make_request('POST', '/api/scores/', json=data, headers=headers)
        
    def update_score(self, exercise_id: int, data: Dict[str, Any], headers: Dict[str, str]) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Update score"""
        return self._make_request('PUT', f'/api/scores/{exercise_id}', json=data, headers=headers)
    
    def health_check(self) -> Tuple[Optional[Dict[Any, Any]], int]:
        """Check scores service health"""
        try:
            return UserManagementServiceClient.health_check(self)
        except Exception:
            return self._make_request('GET', '/health')