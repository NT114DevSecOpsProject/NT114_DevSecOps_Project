import pytest
from app.main import app 

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    return TestClient(app)

def test_submit_score_validation(client):
    # Kiểm tra submission thiếu trường dữ liệu cần thiết
    invalid_submission = {
        "user_id": 1,
        # Thiếu exercise_id và results
    }
    response = client.post("/scores/", json=invalid_submission)
    
    # Kiểm tra lỗi validation
    assert response.status_code == 422 

def test_get_user_progress(client):
    # Kiểm tra endpoint lấy tiến trình học tập của một user cụ thể
    user_id = 1
    response = client.get(f"/scores/progress/{user_id}")
    
    assert response.status_code == 200
    
    # Kiểm tra kết quả trả về là một dictionary có chứa các key quan trọng
    data = response.json()
    assert isinstance(data, dict)
    assert "totalAttempts" in data 
    assert "successRate" in data