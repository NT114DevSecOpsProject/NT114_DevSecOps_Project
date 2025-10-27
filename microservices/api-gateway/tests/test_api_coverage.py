import pytest
from unittest.mock import patch, MagicMock
from app import app # Import app đã sửa lỗi import 
import json

# Setup client cho môi trường test Flask
# @pytest.fixture
# def client():
#     app.config['TESTING'] = True
#     return app.test_client()

# TOKEN MOCK: Giả định một token hợp lệ và admin token
MOCK_HEADERS = {'Authorization': 'Bearer valid_user_token'}
ADMIN_HEADERS = {'Authorization': 'Bearer admin_token'}

# Mock cho middleware.require_auth để bỏ qua xác thực thực tế
@patch('app.middleware.AuthMiddleware.authenticate', return_value=True)
@patch('app.middleware.require_auth')
def mock_require_auth(mock_decorator, mock_auth_method):
    # Mock decorator để nó chỉ trả về hàm gốc mà không kiểm tra token thực tế
    mock_decorator.return_value = lambda f: f
    return mock_decorator

# Mock cho middleware.require_admin để bỏ qua xác thực thực tế
@patch('app.middleware.AuthMiddleware.check_admin_privileges', return_value=True)
@patch('app.middleware.require_admin')
def mock_require_admin(mock_decorator, mock_admin_method):
    mock_decorator.return_value = lambda f: f
    return mock_decorator

# Mock cho các Service Client (trả về thành công 200)
def mock_client_response(status_code, data=None):
    if data is None:
        data = {"status": "success"}
    return data, status_code

# ====================================================================
# TEST COVERAGE CÁC ROUTES AUTH VÀ INPUT VALIDATION
# ====================================================================

@mock_require_auth
@patch('app.services.UserManagementServiceClient.register')
def test_register_route_success(mock_register, client, *args):
    """Test POST /auth/register success case."""
    mock_register.return_value = mock_client_response(201, {"user_id": 1})
    
    response = client.post('/auth/register', 
                           data=json.dumps({"username": "new", "password": "pwd"}),
                           content_type='application/json')
                           
    assert response.status_code == 201
    assert mock_register.called

@mock_require_auth
def test_register_route_invalid_payload(client, *args):
    """Test POST /auth/register with empty payload (if not data: branch)."""
    # Test nhánh xử lý if not data: (dòng 115)
    response = client.post('/auth/register', data=json.dumps({}), content_type='application/json')
    assert response.status_code == 400
    assert response.get_json()['message'] == 'Invalid payload'

@mock_require_auth
@patch('app.services.UserManagementServiceClient.logout')
def test_logout_route(mock_logout, client, *args):
    """Test GET /auth/logout (Authenticated route)."""
    mock_logout.return_value = mock_client_response(200, {"message": "Logged out"})
    
    response = client.get('/auth/logout', headers=MOCK_HEADERS)
    assert response.status_code == 200

# ====================================================================
# TEST COVERAGE ROUTES VỚI ADMIN VÀ PAYLOAD
# ====================================================================

@mock_require_admin
@patch('app.services.ExercisesServiceClient.create_exercise')
def test_create_exercise_route_invalid_payload(mock_create_exercise, client, *args):
    """Test POST /exercises/ with empty payload (if not data: branch)."""
    # Test nhánh xử lý if not data: (dòng 193)
    response = client.post('/exercises/', data=json.dumps({}), content_type='application/json', headers=ADMIN_HEADERS)
    assert response.status_code == 400
    assert response.get_json()['message'] == 'Invalid payload'
    assert not mock_create_exercise.called # Đảm bảo service không được gọi

@mock_require_admin
@patch('app.services.ExercisesServiceClient.update_exercise')
def test_update_exercise_route_successful(mock_update_exercise, client, *args):
    """Test PUT /exercises/<id> successful path."""
    mock_update_exercise.return_value = mock_client_response(200, {"status": "updated"})

    response = client.put('/exercises/10', 
                          data=json.dumps({"title": "new title"}),
                          content_type='application/json',
                          headers=ADMIN_HEADERS)
    
    assert response.status_code == 200
    assert mock_update_exercise.called

# ====================================================================
# TEST COVERAGE ROUTES CUỐI CÙNG VÀ ERROR HANDLERS
# ====================================================================

@mock_require_auth
@patch('app.services.ScoresServiceClient.update_score')
def test_update_score_route_unauthorized(mock_update_score, client, *args):
    """Test PUT /scores/<id> with empty payload (if not data: branch)."""
    # Test nhánh xử lý if not data: (dòng 279)
    response = client.put('/scores/5', data=json.dumps({}), content_type='application/json', headers=MOCK_HEADERS)
    assert response.status_code == 400
    assert response.get_json()['message'] == 'Invalid payload'

def test_not_found_errorhandler(client):
    """Test the generic 404 error handler (dòng 295)."""
    response = client.get('/this-path-does-not-exist')
    assert response.status_code == 404
    assert response.get_json()['message'] == 'Endpoint not found'

def test_internal_error_errorhandler(client):
    """
    Test the generic 500 error handler (dòng 308). 
    Note: Requires triggering an actual exception if not explicitly mocked.
    """
    
    @app.route('/test-500', methods=['GET'])
    def test_500_trigger():
        raise Exception("Forced error")

    response = client.get('/test-500')
    # Flask sẽ bắt lỗi và trả về 500
    assert response.status_code == 500 
    assert response.get_json()['message'] == 'Internal server error'