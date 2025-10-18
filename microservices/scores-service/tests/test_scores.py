import pytest
from app.main import app
# Giả định bạn có một hàm utility cho logic scoring
# from app.utils import calculate_score 

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    return TestClient(app)

def test_submit_score_endpoint_success(client):
    # Giả định submission data
    submission_data = {
        "user_id": 1,
        "exercise_id": 10,
        "results": [True, True, False], # Kết quả submission (ví dụ)
        "language": "python"
    }
    
    # Giả định endpoint là /scores/submit
    response = client.post("/api/v1/scores/submit", json=submission_data)
    
    # Kiểm tra response thành công (hoặc 201 Created)
    assert response.status_code == 200 or response.status_code == 201
    assert "score_id" in response.json() 

def test_user_progress_endpoint(client):
    # Kiểm tra endpoint thống kê của người dùng
    user_id = 1
    response = client.get(f"/api/v1/scores/progress/{user_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert "totalAttempts" in data
    assert data["totalAttempts"] >= 0 # Kiểm tra dữ liệu hợp lệ