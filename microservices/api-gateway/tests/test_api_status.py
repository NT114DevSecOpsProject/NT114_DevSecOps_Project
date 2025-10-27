import pytest
from unittest.mock import patch, MagicMock
from app import app # ĐÃ SỬA: Import trực tiếp biến app từ file app.py

# Giả định kiến trúc của bạn dùng Flask/FastAPI TestClient
@pytest.fixture
def client():
    #Sử dụng TestClient phù hợp với framework của bạn (đã sửa sang Flask TestClient)
    #Vì app.py dùng Flask, nên cần sử dụng Flask TestClient
    app.config['TESTING'] = True
    return app.test_client()


# Mock phản hồi từ các dịch vụ backend
def mock_user_response(status_code, json_data):
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    
    # Flask Test Client không có .json(), nó có .get_json() hoặc data/json
    # Tuy nhiên, mock response thường chỉ cần status_code
    
    mock_resp.get_json.return_value = json_data # Giả định nếu code dùng response.get_json()
    mock_resp.return_value = MagicMock(status_code=status_code, json=lambda: json_data)
    
    return mock_resp.return_value # Trả về đối tượng mock để kiểm tra status_code

@patch('app.services.UserManagementServiceClient.health_check') # SỬA: Mock chính xác vào phương thức health_check
def test_health_check_all_healthy(mock_health, client):
    # Thiết lập mock: Cả 3 client đều trả về 200 (Mock cho hàm _check_service_health)
    # Vì health_check gọi 3 services, ta cần mock 3 lần
    
    # Thiết lập cho UserManagementServiceClient.health_check
    mock_health.side_effect = [(None, 200), (None, 200), (None, 200)] 
    
    response = client.get("/health") 

    # Kiểm tra trạng thái tổng thể và nội dung
    assert response.status_code == 200
    assert response.get_json()["status"] == "healthy"


@patch('app.services.UserManagementServiceClient.health_check')
def test_health_check_partial_unhealthy(mock_health, client):
    # Thiết lập mock: User Service bị lỗi (500), các dịch vụ khác hoạt động
    mock_health.side_effect = [(None, 500), (None, 200), (None, 200)]

    response = client.get("/health") 
    
    # Kiểm tra trạng thái tổng thể là 503
    assert response.status_code == 503 
    
    # Kiểm tra chi tiết service bị lỗi
    data = response.get_json()
    assert data["services"]["user_management_service"]["status"] == "unhealthy"

# TÍCH HỢP CODE CŨ CỦA BẠN VÀO ĐÂY:

@patch('app.services.UserManagementServiceClient.get_single_user') # Giả định get_single_user gọi requests.get
def test_get_user_profile_success(mock_get_user, client):
    # Thiết lập mock cho User Service (endpoint internal)
    mock_get_user.return_value = ({"id": 1, "username": "test_user"}, 200)

    # Test endpoint của API Gateway
    response = client.get("/users/1") 

    # Kiểm tra routing và phản hồi thành công
    assert response.status_code == 200
    assert response.get_json()["username"] == "test_user"

# CẦN SỬA LẠI TEST FAILURE KHÁC ĐỂ KHÔNG BỊ LỖI
# Lỗi cũ của bạn là mock requests.get, giờ ta mock UserManagementServiceClient.get_single_user

# [CÁC TEST KHÁC CẦN ĐƯỢC THÊM VÀO ĐÂY SAU KHI SỬA LỖI MOCK CỦA CHÚNG]