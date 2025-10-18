import pytest
from app.main import app 

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    return TestClient(app)

def test_register_new_user(client):
    # Sử dụng dữ liệu ngẫu nhiên để tránh lỗi trùng lặp khi chạy CI nhiều lần
    import time
    username = f"ci_user_{int(time.time())}"
    email = f"ci_test_{int(time.time())}@example.com"
    
    new_user_data = {
        "username": username,
        "email": email,
        "password": "SecurePassword123"
    }
    
    response = client.post("/api/v1/users/register", json=new_user_data)
    
    # Kiểm tra xem tài khoản mới có được tạo thành công không
    assert response.status_code == 201 
    assert response.json()["username"] == username

def test_login_success(client):
    # Giả định có một user "testuser" đã tồn tại (hoặc được tạo trong setup test)
    login_credentials = {
        "username": "admin", # Sử dụng user mock/setup của bạn
        "password": "adminpassword" 
    }
    
    response = client.post("/api/v1/users/login", data=login_credentials)
    
    # Kiểm tra login thành công (thường trả về token hoặc session)
    assert response.status_code == 200
    assert "token" in response.json() or "access_token" in response.json()

def test_get_user_details_unauthenticated(client):
    # Kiểm tra truy cập thông tin user mà không có token
    response = client.get("/api/v1/users/1")
    
    # Kiểm tra bị từ chối truy cập
    assert response.status_code == 401