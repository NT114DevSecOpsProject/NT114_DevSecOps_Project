"""
Pytest configuration and fixtures for exercises-service tests
"""
import pytest
import os
import sys

# SET DATABASE URL BEFORE importing app
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['TESTING'] = 'true'

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.main import app as flask_app
from app.models import db, Exercise


@pytest.fixture(scope='function', autouse=True)
def setup_database():
    """Setup database for each test"""
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    with flask_app.app_context():
        db.create_all()
        yield
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope='function')
def app():
    """Create application for testing"""
    return flask_app


@pytest.fixture(scope='function')
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture(scope='function')
def headers():
    """Authorization headers for protected endpoints"""
    return {'Authorization': 'Bearer token'}


@pytest.fixture(scope='function')
def sample_data():
    """Sample exercise data for testing"""
    return {
        'title': 'Sum Test',
        'body': 'Add two numbers',
        'difficulty': 1,
        'test_cases': [{'input': '1 2', 'output': '3'}],
        'solutions': ['def solve(a,b): return a+b'],
        'author': 'test_user',
        'category': 'algorithms'
    }


@pytest.fixture(scope='function')
def sample_exercise(app):
    """Create a sample exercise in the database"""
    with app.app_context():
        exercise = Exercise(
            title='Test Exercise',
            body='Write a function that returns Hello World',
            difficulty=1,
            test_cases=[{'input': '', 'output': 'Hello World'}],
            solutions=['def solution(): return "Hello World"']
        )
        db.session.add(exercise)
        db.session.commit()
        return exercise.id