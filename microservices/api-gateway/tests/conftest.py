import pytest
from unittest.mock import patch, MagicMock

# Đảm bảo import file app.py từ thư mục cha (..)
# Do tests/ nằm ngang hàng với app.py
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import biến app sau khi đã sửa sys.path
from app import app as flask_app 

# Fixture client chuẩn cho Flask
@pytest.fixture(scope='module')
def client():
    # Cấu hình ứng dụng cho môi trường test
    flask_app.config['TESTING'] = True
    
    # Thiết lập mock client
    with flask_app.test_client() as client:
        yield client

# Mock cho các Service Client để tránh lỗi mạng và kết nối DB
@pytest.fixture(autouse=True)
def mock_all_clients():
    # Sử dụng MagicMock cho tất cả các Service Client
    with patch('app.services.UserManagementServiceClient') as MockUser, \
         patch('app.services.ExercisesServiceClient') as MockExercises, \
         patch('app.services.ScoresServiceClient') as MockScores, \
         patch('app.middleware.AuthMiddleware') as MockAuthMiddleware:
        
        # Thiết lập các phản hồi mặc định
        # Giả định health_check luôn thành công
        MockUser.return_value.health_check.return_value = ({}, 200)
        MockExercises.return_value.health_check.return_value = ({}, 200)
        MockScores.return_value.health_check.return_value = ({}, 200)
        
        # Thiết lập phản hồi cho middleware auth (để @require_auth pass)
        MockAuthMiddleware.return_value.authenticate.return_value = True
        MockAuthMiddleware.return_value.check_admin_privileges.return_value = True
        
        yield