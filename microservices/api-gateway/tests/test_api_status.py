import pytest
from unittest.mock import patch, MagicMock
from app.app import app # Giả định code chính nằm trong app/app.py và biến là app

# Giả định kiến trúc của bạn dùng Flask/FastAPI TestClient
@pytest.fixture
def client():
    # Sử dụng TestClient phù hợp với framework của bạn (vd: Flask, FastAPI)
    from fastapi.testclient import TestClient
    return TestClient(app)

# Mock phản hồi từ các dịch vụ backend
def mock_user_response(status_code, json_data):
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.json.return_value = json_data
    return mock_resp

@patch('app.services.requests.get') # Giả định API Gateway dùng requests.get để gọi services
def test_get_user_profile_success(mock_get, client):
    # Thiết lập mock cho User Service (endpoint internal)
    mock_get.return_value = mock_user_response(200, {"id": 1, "username": "test_user"})

    # Test endpoint của API Gateway
    response = client.get("/users/1") 

    # Kiểm tra routing và phản hồi thành công
    assert response.status_code == 200
    assert response.json()["username"] == "test_user"
    assert mock_get.called # Đảm bảo service đã được gọi

@patch('app.services.requests.get')
def test_get_exercise_list_failure(mock_get, client):
    # Thiết lập mock cho Exercises Service (endpoint internal) bị lỗi
    mock_get.return_value = mock_user_response(500, {"detail": "Internal server error"})

    # Test endpoint của API Gateway
    response = client.get("/exercises") 
    
    # Kiểm tra API Gateway có xử lý lỗi đúng không (thường là trả về 500 hoặc 503)
    assert response.status_code == 500 
    assert "error" in response.json()