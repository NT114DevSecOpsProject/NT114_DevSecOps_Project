# test_api_status.py (trong thư mục tests/)
import pytest
from api_gateway.app import app # Giả sử code chính nằm trong app.py và biến là app

@pytest.fixture
def client():
    # Cấu hình client test cho Flask/FastAPI
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_status_endpoint(client):
    # Test một endpoint đơn giản như /status hoặc /health
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json['status'] == 'ok'

def test_user_service_mock_call(client):
    # Test một mock call đơn giản
    # Đây là nơi bạn kiểm tra logic gọi service bên trong api-gateway
    response = client.get('/users/1')
    assert response.status_code != 500