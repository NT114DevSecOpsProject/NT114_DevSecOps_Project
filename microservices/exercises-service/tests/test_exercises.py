import pytest
from app.main import app 
# Giả định model và API logic được import từ app/
from app.models import Exercise 

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    return TestClient(app)

def test_exercise_model_creation():
    # Kiểm tra logic model cơ bản
    ex = Exercise(title="Sum Test", body="Add two numbers", difficulty=1)
    assert ex.title == "Sum Test"
    assert ex.difficulty == 1

def test_get_exercises_endpoint(client):
    # Kiểm tra việc lấy danh sách bài tập (có thể rỗng)
    response = client.get("/api/v1/exercises") 
    
    assert response.status_code == 200
    assert isinstance(response.json(), list) 
    
# Để có coverage cao hơn, bạn cần thêm test cho:
# - POST /api/v1/exercises (thêm bài tập mới)
# - GET /api/v1/exercises/{id} (lấy bài tập cụ thể)