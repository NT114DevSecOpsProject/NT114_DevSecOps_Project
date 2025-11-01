import pytest
from unittest.mock import patch, MagicMock
from app import app
import secrets

@pytest.fixture
def client():
    app.config['TESTING'] = True
    return app.test_client()

# new fixture to avoid hard-coded passwords in tests
@pytest.fixture
def test_password():
    return secrets.token_urlsafe(8)

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
    

@patch('app.middleware.AuthMiddleware.verify_token')
@patch('app.services.UserManagementServiceClient.get_single_user')
def test_get_user_profile_success(mock_get_user, mock_verify_token, client):
    mock_verify_token.return_value = {"username": "test_user", "admin": False}
    mock_get_user.return_value = ({"id": 1, "username": "test_user"}, 200)
    response = client.get("/users/1", headers={"Authorization": "Bearer token"})
    assert response.status_code == 200
    assert response.get_json()["username"] == "test_user"

@patch('app.middleware.AuthMiddleware.verify_token')
@patch('app.services.UserManagementServiceClient.get_single_user')
def test_get_user_profile_not_found(mock_get_user, mock_verify_token, client):
    mock_verify_token.return_value = {"username": "test_user", "admin": False}
    mock_get_user.return_value = ({"message": "User not found"}, 404)
    response = client.get("/users/999", headers={"Authorization": "Bearer token"})
    assert response.status_code == 404
    assert response.get_json()["message"] == "User not found"

@patch('app.middleware.AuthMiddleware.verify_token')
@patch('app.services.UserManagementServiceClient.get_all_users')
def test_get_all_users_success(mock_get_all_users, mock_verify_token, client):
    mock_verify_token.return_value = {"username": "test_user", "admin": False}
    mock_get_all_users.return_value = ([{"id": 1, "username": "test_user"}], 200)
    response = client.get("/users", headers={"Authorization": "Bearer token"})
    assert response.status_code == 200
    assert isinstance(response.get_json(), list)
    assert response.get_json()[0]["username"] == "test_user"

@patch('app.services.UserManagementServiceClient.register')
def test_register_success(mock_register, client, test_password):
    mock_register.return_value = ({"status": "success"}, 201)
    response = client.post("/auth/register", json={"username": "newuser", "password": test_password})
    assert response.status_code == 201
    assert response.get_json()["status"] == "success"

@patch('app.services.UserManagementServiceClient.register')
def test_register_invalid_payload(mock_register, client):
    response = client.post("/auth/register", data="notjson")
    assert response.status_code == 400
    assert response.get_json()["message"] == "Invalid payload"

@patch('app.services.UserManagementServiceClient.login')
def test_login_success(mock_login, client, test_password):
    mock_login.return_value = ({"token": "abc"}, 200)
    response = client.post("/auth/login", json={"username": "user", "password": test_password})
    assert response.status_code == 200
    assert response.get_json()["token"] == "abc"

@patch('app.services.UserManagementServiceClient.login')
def test_login_invalid_payload(mock_login, client):
    response = client.post("/auth/login", data="notjson")
    assert response.status_code == 400
    assert response.get_json()["message"] == "Invalid payload"

@patch('app.services.UserManagementServiceClient.logout')
@patch('app.middleware.AuthMiddleware.verify_token')
def test_logout_success(mock_verify_token, mock_logout, client):
    mock_verify_token.return_value = {"username": "test_user", "admin": False}
    mock_logout.return_value = ({"status": "success"}, 200)
    response = client.get("/auth/logout", headers={"Authorization": "Bearer token"})
    assert response.status_code == 200
    assert response.get_json()["status"] == "success"

@patch('app.services.UserManagementServiceClient.get_user_status')
@patch('app.middleware.AuthMiddleware.verify_token')
def test_get_user_status_success(mock_verify_token, mock_get_user_status, client):
    mock_verify_token.return_value = {"username": "test_user", "admin": False}
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

@patch('app.middleware.AuthMiddleware.verify_token')
@patch('app.services.UserManagementServiceClient.add_user')
def test_add_user_success(mock_add_user, mock_verify_token, client, test_password):
    mock_verify_token.return_value = {"username": "test_user", "admin": False}
    mock_add_user.return_value = ({"id": 2, "username": "newuser"}, 201)
    response = client.post("/users/", json={"username": "newuser", "password": test_password}, headers={"Authorization": "Bearer token"})
    assert response.status_code == 201
    assert response.get_json()["username"] == "newuser"

@patch('app.middleware.AuthMiddleware.verify_token')
@patch('app.services.UserManagementServiceClient.admin_create_user')
def test_admin_create_user_success(mock_admin_create, mock_verify_token, client):
    mock_verify_token.return_value = {"username": "admin", "admin": True}
    mock_admin_create.return_value = ({"id": 3, "username": "created_by_admin"}, 201)
    response = client.post("/users/admin_create", json={"username": "created_by_admin"}, headers={"Authorization": "Bearer token"})
    assert response.status_code == 201
    assert response.get_json()["username"] == "created_by_admin"

@patch('app.middleware.AuthMiddleware.verify_token')
@patch('app.services.ExercisesServiceClient.create_exercise')
def test_create_exercise_admin_required(mock_create_exercise, mock_verify_token, client):
    # non-admin should be forbidden
    mock_verify_token.return_value = {"username": "user", "admin": False}
    response = client.post("/exercises/", json={"title": "ex1"}, headers={"Authorization": "Bearer token"})
    assert response.status_code == 403

@patch('app.middleware.AuthMiddleware.verify_token')
@patch('app.services.ExercisesServiceClient.create_exercise')
def test_create_exercise_success(mock_create_exercise, mock_verify_token, client):
    mock_verify_token.return_value = {"username": "admin", "admin": True}
    mock_create_exercise.return_value = ({"id": 10, "title": "ex1"}, 201)
    response = client.post("/exercises/", json={"title": "ex1"}, headers={"Authorization": "Bearer token"})
    assert response.status_code == 201
    assert response.get_json()["id"] == 10

@patch('app.middleware.AuthMiddleware.verify_token')
@patch('app.services.ExercisesServiceClient.validate_code')
def test_validate_code_invalid_payload(mock_validate_code, mock_verify_token, client):
    # mock authentication so request passes auth and hits payload validation
    mock_verify_token.return_value = {"username": "test_user", "admin": False}
    response = client.post("/exercises/validate_code", data="notjson", headers={"Authorization": "Bearer token"})
    assert response.status_code == 400
    assert response.get_json()["message"] == "Invalid payload"

@patch('app.middleware.AuthMiddleware.verify_token')
@patch('app.services.ScoresServiceClient.create_score')
def test_create_score_and_update_score(mock_create_score, mock_verify_token, client):
    mock_verify_token.return_value = {"username": "test_user", "admin": False}
    mock_create_score.return_value = ({"id": 5, "score": 100}, 201)
    resp = client.post("/scores/", json={"exercise_id": 1, "score": 100}, headers={"Authorization": "Bearer token"})
    assert resp.status_code == 201
    assert resp.get_json()["id"] == 5

    # update score
    with patch('app.services.ScoresServiceClient.update_score') as mock_update:
        mock_update.return_value = ({"id": 5, "score": 110}, 200)
        resp2 = client.put("/scores/1", json={"score": 110}, headers={"Authorization": "Bearer token"})
        assert resp2.status_code == 200
        assert resp2.get_json()["score"] == 110

@patch('app.middleware.AuthMiddleware.verify_token')
@patch('app.services.ScoresServiceClient.get_scores_by_user')
def test_get_scores_by_user_success(mock_get_scores, mock_verify_token, client):
    mock_verify_token.return_value = {"username": "test_user", "admin": False}
    mock_get_scores.return_value = ([{"id": 1, "score": 90}], 200)
    resp = client.get("/scores/user", headers={"Authorization": "Bearer token"})
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)

@patch('app.middleware.AuthMiddleware.verify_token')
@patch('app.services.ExercisesServiceClient.delete_exercise')
def test_delete_exercise_admin(mock_delete, mock_verify_token, client):
    mock_verify_token.return_value = {"username": "admin", "admin": True}
    mock_delete.return_value = ({"message": "deleted"}, 200)
    resp = client.delete("/exercises/2", headers={"Authorization": "Bearer token"})
    assert resp.status_code == 200
    assert resp.get_json()["message"] == "deleted"