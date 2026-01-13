"""
Test service client methods in services.py
"""
import pytest
from unittest.mock import patch, MagicMock
import requests
from services import (
    ServiceClient,
    UserManagementServiceClient,
    ExercisesServiceClient,
    ScoresServiceClient
)


class TestServiceClient:
    """Test base ServiceClient class"""

    def test_init(self):
        """Test ServiceClient initialization"""
        client = ServiceClient("http://localhost:5000", timeout=60)
        assert client.base_url == "http://localhost:5000"
        assert client.timeout == 60

    def test_init_strips_trailing_slash(self):
        """Test that trailing slash is stripped from base_url"""
        client = ServiceClient("http://localhost:5000/")
        assert client.base_url == "http://localhost:5000"

    @patch('services.requests.request')
    def test_make_request_success(self, mock_request):
        """Test successful request"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message": "success"}
        mock_request.return_value = mock_response

        client = ServiceClient("http://localhost:5000")
        result, status = client._make_request('GET', '/api/test')

        assert status == 200
        assert result == {"message": "success"}

    @patch('services.requests.request')
    def test_make_request_json_error(self, mock_request):
        """Test request with non-JSON response"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.side_effect = ValueError("No JSON")
        mock_response.text = "Plain text response"
        mock_request.return_value = mock_response

        client = ServiceClient("http://localhost:5000")
        result, status = client._make_request('GET', '/api/test')

        assert status == 200
        assert result == {"message": "Plain text response"}

    @patch('services.requests.request')
    def test_make_request_empty_response(self, mock_request):
        """Test request with empty response"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.side_effect = ValueError("No JSON")
        mock_response.text = ""
        mock_request.return_value = mock_response

        client = ServiceClient("http://localhost:5000")
        result, status = client._make_request('GET', '/api/test')

        assert status == 200
        assert result == {"message": "No response content"}

    @patch('services.requests.request')
    def test_make_request_connection_error(self, mock_request):
        """Test request with connection error"""
        mock_request.side_effect = requests.exceptions.ConnectionError()

        client = ServiceClient("http://localhost:5000")
        result, status = client._make_request('GET', '/api/test')

        assert status == 503
        assert result["status"] == "error"
        assert "unavailable" in result["message"].lower()

    @patch('services.requests.request')
    def test_make_request_timeout(self, mock_request):
        """Test request with timeout"""
        mock_request.side_effect = requests.exceptions.Timeout()

        client = ServiceClient("http://localhost:5000")
        result, status = client._make_request('GET', '/api/test')

        assert status == 504
        assert result["status"] == "error"
        assert "timeout" in result["message"].lower()

    @patch('services.requests.request')
    def test_make_request_generic_error(self, mock_request):
        """Test request with generic error"""
        mock_request.side_effect = Exception("Unknown error")

        client = ServiceClient("http://localhost:5000")
        result, status = client._make_request('GET', '/api/test')

        assert status == 500
        assert result["status"] == "error"
        assert "gateway error" in result["message"].lower()


class TestUserManagementServiceClient:
    """Test UserManagementServiceClient methods"""

    @patch('services.requests.request')
    def test_register_success(self, mock_request):
        """Test successful user registration"""
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"id": 1, "username": "testuser"}
        mock_request.return_value = mock_response

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.register({"username": "testuser", "password": "pass123"})

        assert status == 201
        assert result["id"] == 1

    @patch('services.requests.request')
    def test_register_timeout(self, mock_request):
        """Test register with timeout"""
        mock_request.side_effect = requests.exceptions.Timeout()

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.register({})

        assert status == 504
        assert "timeout" in result["message"].lower()

    @patch('services.requests.request')
    def test_register_connection_error(self, mock_request):
        """Test register with connection error"""
        mock_request.side_effect = requests.exceptions.ConnectionError()

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.register({})

        assert status == 503
        assert "unavailable" in result["message"].lower()

    @patch('services.requests.request')
    def test_register_generic_error(self, mock_request):
        """Test register with generic error"""
        mock_request.side_effect = Exception("Unknown error")

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.register({})

        assert status == 500

    @patch('services.requests.request')
    def test_login_success(self, mock_request):
        """Test successful login"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"token": "abc123"}
        mock_request.return_value = mock_response

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.login({"username": "test", "password": "pass"})

        assert status == 200
        assert "token" in result

    @patch('services.requests.request')
    def test_login_timeout(self, mock_request):
        """Test login timeout"""
        mock_request.side_effect = requests.exceptions.Timeout()

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.login({})

        assert status == 504

    @patch('services.requests.request')
    def test_logout_success(self, mock_request):
        """Test successful logout"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message": "Logged out"}
        mock_request.return_value = mock_response

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.logout({"Authorization": "Bearer token123"})

        assert status == 200

    @patch('services.requests.request')
    def test_logout_timeout(self, mock_request):
        """Test logout timeout"""
        mock_request.side_effect = requests.exceptions.Timeout()

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.logout({"Authorization": "Bearer token"})

        assert status == 504

    @patch('services.requests.request')
    def test_get_user_status_success(self, mock_request):
        """Test get user status success"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"user": "active"}
        mock_request.return_value = mock_response

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.get_user_status({"Authorization": "Bearer token"})

        assert status == 200

    @patch('services.requests.request')
    def test_verify_token_success(self, mock_request):
        """Test verify token success"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"valid": True}
        mock_request.return_value = mock_response

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.verify_token("valid_token")

        assert status == 200

    @patch('services.requests.request')
    def test_get_all_users_success(self, mock_request):
        """Test get all users success"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"users": []}
        mock_request.return_value = mock_response

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.get_all_users({"Authorization": "Bearer token"})

        assert status == 200
        assert "users" in result

    @patch('services.requests.request')
    def test_get_single_user_success(self, mock_request):
        """Test get single user success"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": 1, "username": "test"}
        mock_request.return_value = mock_response

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.get_single_user(1, {"Authorization": "Bearer token"})

        assert status == 200
        assert result["id"] == 1

    @patch('services.requests.request')
    def test_add_user_success(self, mock_request):
        """Test add user success"""
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"id": 2}
        mock_request.return_value = mock_response

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.add_user(
            {"username": "new"}, {"Authorization": "Bearer token"}
        )

        assert status == 201

    @patch('services.requests.request')
    def test_admin_create_user_success(self, mock_request):
        """Test admin create user success"""
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"id": 3}
        mock_request.return_value = mock_response

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.admin_create_user(
            {"username": "admin_created"}, {"Authorization": "Bearer token"}
        )

        assert status == 201

    @patch('services.requests.request')
    def test_health_check_success(self, mock_request):
        """Test health check success"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "healthy"}
        mock_request.return_value = mock_response

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.health_check()

        assert status == 200

    @patch('services.requests.request')
    def test_health_check_failure(self, mock_request):
        """Test health check failure"""
        mock_request.side_effect = requests.exceptions.ConnectionError()

        client = UserManagementServiceClient("http://localhost:5000")
        result, status = client.health_check()

        assert status == 503


class TestExercisesServiceClient:
    """Test ExercisesServiceClient methods"""

    @patch('services.requests.request')
    def test_get_all_exercises_success(self, mock_request):
        """Test get all exercises"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"exercises": []}
        mock_request.return_value = mock_response

        client = ExercisesServiceClient("http://localhost:5000")
        result, status = client.get_all_exercises({"Authorization": "Bearer token"})

        assert status == 200
        assert "exercises" in result

    @patch('services.requests.request')
    def test_get_all_exercises_timeout(self, mock_request):
        """Test timeout when getting exercises"""
        mock_request.side_effect = requests.exceptions.Timeout()

        client = ExercisesServiceClient("http://localhost:5000")
        result, status = client.get_all_exercises({"Authorization": "Bearer token"})

        assert status == 504

    @patch('services.requests.request')
    def test_get_all_exercises_connection_error(self, mock_request):
        """Test connection error"""
        mock_request.side_effect = requests.exceptions.ConnectionError()

        client = ExercisesServiceClient("http://localhost:5000")
        result, status = client.get_all_exercises({"Authorization": "Bearer token"})

        assert status == 503

    @patch('services.requests.request')
    def test_get_single_exercise_success(self, mock_request):
        """Test get single exercise"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": 1, "title": "Test"}
        mock_request.return_value = mock_response

        client = ExercisesServiceClient("http://localhost:5000")
        result, status = client.get_single_exercise(1, {"Authorization": "Bearer token"})

        assert status == 200
        assert result["id"] == 1

    @patch('services.requests.request')
    def test_get_single_exercise_timeout(self, mock_request):
        """Test get single exercise timeout"""
        mock_request.side_effect = requests.exceptions.Timeout()

        client = ExercisesServiceClient("http://localhost:5000")
        result, status = client.get_single_exercise(1, {"Authorization": "Bearer token"})

        assert status == 504

    @patch('services.requests.request')
    def test_create_exercise_success(self, mock_request):
        """Test create exercise"""
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"id": 2}
        mock_request.return_value = mock_response

        client = ExercisesServiceClient("http://localhost:5000")
        result, status = client.create_exercise(
            {"title": "New"}, {"Authorization": "Bearer token"}
        )

        assert status == 201

    @patch('services.requests.request')
    def test_create_exercise_timeout(self, mock_request):
        """Test create exercise timeout"""
        mock_request.side_effect = requests.exceptions.Timeout()

        client = ExercisesServiceClient("http://localhost:5000")
        result, status = client.create_exercise({}, {"Authorization": "Bearer token"})

        assert status == 504

    @patch('services.requests.request')
    def test_update_exercise_success(self, mock_request):
        """Test update exercise"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": 1}
        mock_request.return_value = mock_response

        client = ExercisesServiceClient("http://localhost:5000")
        result, status = client.update_exercise(
            1, {"title": "Updated"}, {"Authorization": "Bearer token"}
        )

        assert status == 200

    @patch('services.requests.request')
    def test_update_exercise_timeout(self, mock_request):
        """Test update exercise timeout"""
        mock_request.side_effect = requests.exceptions.Timeout()

        client = ExercisesServiceClient("http://localhost:5000")
        result, status = client.update_exercise(1, {}, {"Authorization": "Bearer token"})

        assert status == 504

    @patch('services.requests.request')
    def test_delete_exercise_success(self, mock_request):
        """Test delete exercise"""
        mock_response = MagicMock()
        mock_response.status_code = 204
        mock_response.json.return_value = {}
        mock_request.return_value = mock_response

        client = ExercisesServiceClient("http://localhost:5000")
        result, status = client.delete_exercise(1, {"Authorization": "Bearer token"})

        assert status == 204

    @patch('services.requests.request')
    def test_delete_exercise_timeout(self, mock_request):
        """Test delete exercise timeout"""
        mock_request.side_effect = requests.exceptions.Timeout()

        client = ExercisesServiceClient("http://localhost:5000")
        result, status = client.delete_exercise(1, {"Authorization": "Bearer token"})

        assert status == 504

    @patch('services.requests.request')
    def test_validate_code_success(self, mock_request):
        """Test validate code success"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"valid": True}
        mock_request.return_value = mock_response

        client = ExercisesServiceClient("http://localhost:5000")
        result, status = client.validate_code(
            {"code": "print('hello')"}, {"Authorization": "Bearer token"}
        )

        assert status == 200

    @patch('services.requests.request')
    def test_health_check_success(self, mock_request):
        """Test health check success"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "healthy"}
        mock_request.return_value = mock_response

        client = ExercisesServiceClient("http://localhost:5000")
        result, status = client.health_check()

        assert status == 200

    @patch('services.requests.request')
    def test_health_check_fallback(self, mock_request):
        """Test health check fallback to /health endpoint"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "healthy"}
        mock_request.return_value = mock_response

        client = ExercisesServiceClient("http://localhost:5000")
        result, status = client.health_check()

        assert status == 200


class TestScoresServiceClient:
    """Test ScoresServiceClient methods"""

    @patch('services.requests.request')
    def test_get_all_scores_success(self, mock_request):
        """Test get all scores"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"scores": []}
        mock_request.return_value = mock_response

        client = ScoresServiceClient("http://localhost:5000")
        result, status = client.get_all_scores({"Authorization": "Bearer token"})

        assert status == 200

    @patch('services.requests.request')
    def test_get_all_scores_timeout(self, mock_request):
        """Test get all scores timeout"""
        mock_request.side_effect = requests.exceptions.Timeout()

        client = ScoresServiceClient("http://localhost:5000")
        result, status = client.get_all_scores({"Authorization": "Bearer token"})

        assert status == 504

    @patch('services.requests.request')
    def test_get_scores_by_user_success(self, mock_request):
        """Test get scores by user"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"scores": []}
        mock_request.return_value = mock_response

        client = ScoresServiceClient("http://localhost:5000")
        result, status = client.get_scores_by_user({"Authorization": "Bearer token"})

        assert status == 200

    @patch('services.requests.request')
    def test_get_scores_by_user_timeout(self, mock_request):
        """Test get scores by user timeout"""
        mock_request.side_effect = requests.exceptions.Timeout()

        client = ScoresServiceClient("http://localhost:5000")
        result, status = client.get_scores_by_user({"Authorization": "Bearer token"})

        assert status == 504

    @patch('services.requests.request')
    def test_get_single_score_by_user_success(self, mock_request):
        """Test get single score by user"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": 1, "score": 100}
        mock_request.return_value = mock_response

        client = ScoresServiceClient("http://localhost:5000")
        result, status = client.get_single_score_by_user(1, {"Authorization": "Bearer token"})

        assert status == 200

    @patch('services.requests.request')
    def test_create_score_success(self, mock_request):
        """Test create score"""
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"id": 1}
        mock_request.return_value = mock_response

        client = ScoresServiceClient("http://localhost:5000")
        result, status = client.create_score(
            {"user_id": 1}, {"Authorization": "Bearer token"}
        )

        assert status == 201

    @patch('services.requests.request')
    def test_create_score_timeout(self, mock_request):
        """Test create score timeout"""
        mock_request.side_effect = requests.exceptions.Timeout()

        client = ScoresServiceClient("http://localhost:5000")
        result, status = client.create_score({}, {"Authorization": "Bearer token"})

        assert status == 504

    @patch('services.requests.request')
    def test_create_score_connection_error(self, mock_request):
        """Test create score connection error"""
        mock_request.side_effect = requests.exceptions.ConnectionError()

        client = ScoresServiceClient("http://localhost:5000")
        result, status = client.create_score({}, {"Authorization": "Bearer token"})

        assert status == 503

    @patch('services.requests.request')
    def test_update_score_success(self, mock_request):
        """Test update score"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": 1}
        mock_request.return_value = mock_response

        client = ScoresServiceClient("http://localhost:5000")
        result, status = client.update_score(
            1, {"score": 100}, {"Authorization": "Bearer token"}
        )

        assert status == 200

    @patch('services.requests.request')
    def test_update_score_timeout(self, mock_request):
        """Test update score timeout"""
        mock_request.side_effect = requests.exceptions.Timeout()

        client = ScoresServiceClient("http://localhost:5000")
        result, status = client.update_score(1, {}, {"Authorization": "Bearer token"})

        assert status == 504

    @patch('services.requests.request')
    def test_health_check_success(self, mock_request):
        """Test health check success"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "healthy"}
        mock_request.return_value = mock_response

        client = ScoresServiceClient("http://localhost:5000")
        result, status = client.health_check()

        assert status == 200

    @patch('services.requests.request')
    def test_health_check_error(self, mock_request):
        """Test health check error"""
        mock_request.side_effect = requests.exceptions.ConnectionError()

        client = ScoresServiceClient("http://localhost:5000")
        result, status = client.health_check()

        assert status == 503