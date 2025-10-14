import pytest
from app.main import app 

# Setup client cho môi trường test (giả định dùng FastAPI TestClient)
@pytest.fixture
def client():
    # Sử dụng context manager của FastAPI/Starlette TestClient
    from fastapi.testclient import TestClient
    return TestClient(app)

def test_read_main_exercises(client):
    # Kiểm tra endpoint cơ bản, ví dụ: lấy danh sách bài tập
    # Giả định endpoint là /exercises/
    response = client.get("/exercises/")
    
    # Kiểm tra xem request có thành công hay không
    assert response.status_code == 200 
    
    # Kiểm tra dữ liệu trả về là một list
    assert isinstance(response.json(), list) 

def test_create_exercise_security(client):
    # Kiểm tra xem API có từ chối request POST không xác thực không
    new_exercise = {"title": "Test new exercise", "body": "test"}
    response = client.post("/exercises/", json=new_exercise)
    
    # Giả định cần token hoặc bị từ chối
    assert response.status_code == 401 or response.status_code == 403