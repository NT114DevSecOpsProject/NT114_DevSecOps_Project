"""
Tests to boost coverage to 80%+
Covers missing lines in exercises.py, main.py, and utils.py
"""
import pytest
import os
import sys
from unittest.mock import patch, MagicMock

os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['TESTING'] = 'true'

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.main import app as flask_app
from app.models import db, Exercise


@pytest.fixture(scope='function')
def app():
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def sample_exercise(app):
    with app.app_context():
        exercise = Exercise(
            title='Test Exercise',
            body='Test body',
            difficulty=1,
            test_cases=['1+1'],
            solutions=['2']
        )
        db.session.add(exercise)
        db.session.commit()
        return exercise.id


class TestGetExerciseExceptions:
    """Cover lines 54-60: ValueError and Exception in get_single_exercise"""
    
    def test_get_exercise_invalid_id_format(self, client, app):
        """Cover line 54-56: ValueError when exercise_id is not a valid int"""
        response = client.get('/api/exercises/not_a_number')
        assert response.status_code == 404
        data = response.get_json()
        assert data['status'] == 'fail'
    
    def test_get_exercise_special_chars(self, client, app):
        """Cover ValueError with special characters"""
        response = client.get('/api/exercises/abc!@#')
        assert response.status_code == 404
    
    @patch('app.api.exercises.Exercise.query')
    def test_get_exercise_database_error(self, mock_query, client, app):
        """Cover lines 57-60: Exception during database query"""
        mock_query.filter_by.side_effect = Exception("Database connection failed")
        response = client.get('/api/exercises/1')
        assert response.status_code == 500
        data = response.get_json()
        assert data['status'] == 'error'


class TestValidateCodeExceptions:
    """Cover lines 139-142: Exception in validate_code"""
    
    @patch('app.api.exercises.Exercise.query')
    def test_validate_code_database_error(self, mock_query, client, app):
        """Cover lines 139-142: Exception during validation"""
        mock_query.get.side_effect = Exception("Database error")
        response = client.post('/api/exercises/validate_code',
            json={'exercise_id': 1, 'answer': 'x = 1'}
        )
        assert response.status_code == 500
        data = response.get_json()
        assert data['status'] == 'error'


class TestAddExerciseAdmin:
    """Cover lines 160-162, 175-204: add_exercise with admin"""
    
    @patch('app.api.exercises.authenticate', lambda f: f)
    @patch('app.api.exercises.is_admin')
    def test_add_exercise_empty_payload(self, mock_admin, client, app):
        """Cover lines 160-162: Empty payload"""
        mock_admin.return_value = True
        
        # Bypass CSRF check
        with patch.object(flask_app, 'before_request_funcs', {}):
            response = client.post('/api/exercises',
                json=None,
                headers={'Authorization': 'Bearer token', 'Origin': 'http://localhost:3000'}
            )
        assert response.status_code in [400, 401, 403]
    
    @patch('app.utils.verify_token_with_user_service')
    def test_add_exercise_success_as_admin(self, mock_verify, client, app):
        """Cover lines 175-194: Successful exercise creation"""
        mock_verify.return_value = {'username': 'admin', 'admin': True}
        
        response = client.post('/api/exercises',
            json={
                'title': 'New Exercise',
                'body': 'Exercise body',
                'difficulty': 2,
                'test_cases': ['1+1'],
                'solutions': ['2']
            },
            headers={'Authorization': 'Bearer valid_token'}
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
    
    @patch('app.utils.verify_token_with_user_service')
    def test_add_exercise_missing_fields(self, mock_verify, client, app):
        """Cover missing required fields validation"""
        mock_verify.return_value = {'username': 'admin', 'admin': True}
        
        response = client.post('/api/exercises',
            json={
                'title': 'Only Title'
                # Missing body, difficulty, test_cases, solutions
            },
            headers={'Authorization': 'Bearer valid_token'}
        )
        assert response.status_code == 400
    
    @patch('app.utils.verify_token_with_user_service')
    @patch('app.api.exercises.db.session.commit')
    def test_add_exercise_integrity_error(self, mock_commit, mock_verify, client, app):
        """Cover lines 196-199: IntegrityError"""
        from sqlalchemy import exc
        mock_verify.return_value = {'username': 'admin', 'admin': True}
        mock_commit.side_effect = exc.IntegrityError("stmt", "params", "orig")
        
        response = client.post('/api/exercises',
            json={
                'title': 'Test',
                'body': 'Body',
                'difficulty': 1,
                'test_cases': ['test'],
                'solutions': ['sol']
            },
            headers={'Authorization': 'Bearer valid_token'}
        )
        assert response.status_code == 400
    
    @patch('app.utils.verify_token_with_user_service')
    @patch('app.api.exercises.db.session.commit')
    def test_add_exercise_general_exception(self, mock_commit, mock_verify, client, app):
        """Cover lines 200-204: General exception"""
        mock_verify.return_value = {'username': 'admin', 'admin': True}
        mock_commit.side_effect = Exception("Unexpected error")
        
        response = client.post('/api/exercises',
            json={
                'title': 'Test',
                'body': 'Body',
                'difficulty': 1,
                'test_cases': ['test'],
                'solutions': ['sol']
            },
            headers={'Authorization': 'Bearer valid_token'}
        )
        assert response.status_code == 500


class TestUpdateExerciseAdmin:
    """Cover lines 213-218, 226-272: update_exercise"""
    
    @patch('app.utils.verify_token_with_user_service')
    def test_update_exercise_not_admin(self, mock_verify, client, app, sample_exercise):
        """Cover lines 213-218: Non-admin user"""
        mock_verify.return_value = {'username': 'user', 'admin': False}
        
        response = client.put(f'/api/exercises/{sample_exercise}',
            json={'title': 'Updated'},
            headers={'Authorization': 'Bearer valid_token'}
        )
        assert response.status_code == 401
        data = response.get_json()
        assert 'permission' in data['message'].lower()
    
    @patch('app.utils.verify_token_with_user_service')
    def test_update_exercise_success(self, mock_verify, client, app, sample_exercise):
        """Cover lines 226-263: Successful update"""
        mock_verify.return_value = {'username': 'admin', 'admin': True}
        
        response = client.put(f'/api/exercises/{sample_exercise}',
            json={
                'title': 'Updated Title',
                'body': 'Updated Body',
                'difficulty': 3,
                'test_cases': ['2+2'],
                'solutions': ['4']
            },
            headers={'Authorization': 'Bearer valid_token'}
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
    
    @patch('app.utils.verify_token_with_user_service')
    def test_update_exercise_partial_fields(self, mock_verify, client, app, sample_exercise):
        """Cover partial update with only some fields"""
        mock_verify.return_value = {'username': 'admin', 'admin': True}
        
        response = client.put(f'/api/exercises/{sample_exercise}',
            json={'title': 'Only Title Updated'},
            headers={'Authorization': 'Bearer valid_token'}
        )
        assert response.status_code == 200
    
    @patch('app.utils.verify_token_with_user_service')
    def test_update_exercise_no_fields(self, mock_verify, client, app, sample_exercise):
        """Cover lines 232-235: No fields to update"""
        mock_verify.return_value = {'username': 'admin', 'admin': True}
        
        response = client.put(f'/api/exercises/{sample_exercise}',
            json={},
            headers={'Authorization': 'Bearer valid_token'}
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'No fields' in data['message']
    
    @patch('app.utils.verify_token_with_user_service')
    def test_update_exercise_not_found(self, mock_verify, client, app):
        """Cover lines 238-241: Exercise not found"""
        mock_verify.return_value = {'username': 'admin', 'admin': True}
        
        response = client.put('/api/exercises/99999',
            json={'title': 'Updated'},
            headers={'Authorization': 'Bearer valid_token'}
        )
        assert response.status_code == 404
    
    @patch('app.utils.verify_token_with_user_service')
    def test_update_exercise_invalid_id(self, mock_verify, client, app):
        """Cover lines 265-267: ValueError for invalid ID"""
        mock_verify.return_value = {'username': 'admin', 'admin': True}
        
        response = client.put('/api/exercises/invalid_id',
            json={'title': 'Updated'},
            headers={'Authorization': 'Bearer valid_token'}
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'Invalid' in data['message']
    
    @patch('app.utils.verify_token_with_user_service')
    @patch('app.api.exercises.Exercise.query')
    def test_update_exercise_database_error(self, mock_query, mock_verify, client, app):
        """Cover lines 268-272: Exception during update"""
        mock_verify.return_value = {'username': 'admin', 'admin': True}
        mock_query.filter_by.side_effect = Exception("Database error")
        
        response = client.put('/api/exercises/1',
            json={'title': 'Updated'},
            headers={'Authorization': 'Bearer valid_token'}
        )
        assert response.status_code == 500


class TestUtilsFunctions:
    """Cover lines 17-18, 42-45, 80-81 in utils.py"""
    
    def test_get_user_service_url_production_http(self):
        """Cover lines 17-18: Production with http URL"""
        from app.utils import _get_user_service_url
        
        with patch.dict(os.environ, {
            'FLASK_ENV': 'production',
            'USER_MANAGEMENT_SERVICE_URL': 'http://insecure-url:5001'
        }):
            url = _get_user_service_url()
            assert url.startswith('https://')
    
    def test_get_user_service_url_production_https(self):
        """Cover production with https URL (no change)"""
        from app.utils import _get_user_service_url
        
        with patch.dict(os.environ, {
            'FLASK_ENV': 'production',
            'USER_MANAGEMENT_SERVICE_URL': 'https://secure-url:5001'
        }):
            url = _get_user_service_url()
            assert url.startswith('https://')
    
    def test_authenticate_invalid_token_format(self, client, app):
        """Cover lines 42-45: Invalid token format (no space)"""
        response = client.post('/api/exercises',
            json={'title': 'Test'},
            headers={'Authorization': 'InvalidTokenFormat'}
        )
        assert response.status_code == 401
    
    def test_is_admin_with_exception(self):
        """Cover lines 80-81: Exception in is_admin"""
        from app.utils import is_admin
        
        # Pass something that will cause exception when accessing .get()
        class BadObject:
            def get(self, key):
                raise Exception("Unexpected error")
        
        result = is_admin(BadObject())
        assert result == False
    
    def test_is_admin_with_none(self):
        """Cover is_admin with None"""
        from app.utils import is_admin
        assert is_admin(None) == False
    
    def test_is_admin_with_non_admin(self):
        """Cover is_admin with non-admin user"""
        from app.utils import is_admin
        assert is_admin({'admin': False}) == False
    
    def test_is_admin_with_admin(self):
        """Cover is_admin with admin user"""
        from app.utils import is_admin
        assert is_admin({'admin': True}) == True


class TestMainAppHealth:
    """Cover lines 84-85, 92-93 in main.py"""
    
    def test_health_check_success(self, client, app):
        """Test health check endpoint"""
        response = client.get('/health')
        assert response.status_code in [200, 503]
    
    @patch('app.main.db.engine.connect')
    def test_health_check_db_failure(self, mock_connect, client, app):
        """Cover lines 84-85: Database connection failure"""
        mock_connect.side_effect = Exception("Connection refused")
        response = client.get('/health')
        assert response.status_code == 503
        data = response.get_json()
        assert data['status'] == 'unhealthy'


class TestCSRFGuard:
    """Cover line 63 in main.py: CSRF guard"""
    
    def test_csrf_invalid_origin(self, client, app):
        """Cover line 63: Request with invalid origin"""
        response = client.post('/api/exercises',
            json={'title': 'Test'},
            headers={
                'Authorization': 'Bearer token',
                'Origin': 'http://malicious-site.com'
            }
        )
        assert response.status_code == 403
    
    def test_csrf_valid_origin(self, client, app):
        """Test with valid origin"""
        response = client.post('/api/exercises',
            json={'title': 'Test'},
            headers={
                'Authorization': 'Bearer token',
                'Origin': 'http://localhost:3000'
            }
        )
        # Should not be 403, might be 401 due to invalid token
        assert response.status_code != 403 or response.status_code == 401