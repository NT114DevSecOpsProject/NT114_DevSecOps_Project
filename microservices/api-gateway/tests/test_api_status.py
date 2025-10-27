import pytest
from unittest.mock import patch, MagicMock
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    return app.test_client()

@patch('app.services.UserManagementServiceClient.health_check')
def test_health_check_all_healthy(mock_health, client):
    mock_health.side_effect = [(None, 200), (None, 200), (None, 200)]
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json()["status"] == "healthy"

@patch('app.services.UserManagementServiceClient.health_check')
def test_health_check_partial_unhealthy(mock_health, client):
    mock_health.side_effect = [(None, 500), (None, 200), (None, 200)]
    response = client.get("/health")
    assert response.status_code == 503
    data = response.get_json()
    assert data["services"]["user_management_service"]["status"] == "unhealthy"

@patch('app.services.UserManagementServiceClient.get_single_user')
def test_get_user_profile_success(mock_get_user, client):
    mock_get_user.return_value = ({"id": 1, "username": "test_user"}, 200)
    response = client.get("/users/1")
    assert response.status_code == 200
    assert response.get_json()["username"] == "test_user"

@patch('app.services.UserManagementServiceClient.get_single_user')
def test_get_user_profile_not_found(mock_get_user, client):
    mock_get_user.return_value = ({"message": "User not found"}, 404)
    response = client.get("/users/999")
    assert response.status_code == 404
    assert response.get_json()["message"] == "User not found"

@patch('app.services.UserManagementServiceClient.get_all_users')
def test_get_all_users_success(mock_get_all_users, client):
    mock_get_all_users.return_value = ([{"id": 1, "username": "test_user"}], 200)
    response = client.get("/users")
    assert response.status_code == 200
    assert isinstance(response.get_json(), list)
    assert response.get_json()[0]["username"] == "test_user"

@patch('app.services.UserManagementServiceClient.register')
def test_register_success(mock_register, client):
    mock_register.return_value = ({"status": "success"}, 201)
    response = client.post("/auth/register", json={"username": "newuser", "password": "pass"})
    assert response.status_code == 201
    assert response.get_json()["status"] == "success"

@patch('app.services.UserManagementServiceClient.register')
def test_register_invalid_payload(mock_register, client):
    response = client.post("/auth/register", data="notjson")
    assert response.status_code == 400
    assert response.get_json()["message"] == "Invalid payload"

@patch('app.services.UserManagementServiceClient.login')
def test_login_success(mock_login, client):
    mock_login.return_value = ({"token": "abc"}, 200)
    response = client.post("/auth/login", json={"username": "user", "password": "pass"})
    assert response.status_code == 200
    assert response.get_json()["token"] == "abc"

@patch('app.services.UserManagementServiceClient.login')
def test_login_invalid_payload(mock_login, client):
    response = client.post("/auth/login", data="notjson")
    assert response.status_code == 400
    assert response.get_json()["message"] == "Invalid payload"

@patch('app.services.UserManagementServiceClient.logout')
@patch('app.middleware.AuthMiddleware.extract_token_from_header')
def test_logout_success(mock_extract_token, mock_logout, client):
    mock_extract_token.return_value = "token"
    mock_logout.return_value = ({"status": "success"}, 200)
    response = client.get("/auth/logout", headers={"Authorization": "Bearer token"})
    assert response.status_code == 200
    assert response.get_json()["status"] == "success"

@patch('app.services.UserManagementServiceClient.get_user_status')
@patch('app.middleware.AuthMiddleware.extract_token_from_header')
def test_get_user_status_success(mock_extract_token, mock_get_user_status, client):
    mock_extract_token.return_value = "token"
    mock_get_user_status.return_value = ({"status": "active"}, 200)
    response = client.get("/auth/status", headers={"Authorization": "Bearer token"})
    assert response.status_code == 200
    assert response.get_json()["status"] == "active"

def test_not_found(client):
    response = client.get("/not-exist")
    assert response.status_code == 404
    assert response.get_json()["message"] == "Endpoint not found"

def test_method_not_allowed(client):
    response = client.put("/auth/register")
    assert response.status_code == 405
    assert response.get_json()["message"] == "Method not allowed"