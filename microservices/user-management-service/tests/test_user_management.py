import pytest
from app.main import app 

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    return TestClient(app)

def test_register_user_endpoint(client):
    # Kiểm tra đăng ký với dữ liệu hợp lệ (sẽ thất bại nếu user đã tồn tại)
    new_user_data = {
        "username": "new_test_user_ci",
        "email": "ci_test@example.com",
        "password": "securepassword123"
    }
    response = client.post("/users/register", json=new_user_data)
    
    # Mong đợi 201 (Created) hoặc 400 (Bad Request - nếu user đã tồn tại)
    assert response.status_code in [201, 400] 

def test_login_validation(client):
    # Kiểm tra đăng nhập thiếu mật khẩu
    invalid_login = {"username": "admin"}
    response = client.post("/users/login", json=invalid_login)
    
    assert response.status_code == 422 # Lỗi validation

def test_get_users_unauthorized(client):
    # Kiểm tra truy cập danh sách user mà không có xác thực (admin)
    response = client.get("/users/")
    
    # Mong đợi bị từ chối
    assert response.status_code == 401 or response.status_code == 403