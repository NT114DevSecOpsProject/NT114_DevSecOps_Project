# Design Guidelines and Best Practices

## Overview

This document establishes design guidelines, architectural principles, and best practices for the NT114 DevSecOps project. Following these guidelines ensures consistency, scalability, maintainability, and user experience excellence across all components of the system.

## Table of Contents

1. [Architectural Principles](#architectural-principles)
2. [Microservices Design](#microservices-design)
3. [API Design Guidelines](#api-design-guidelines)
4. [Database Design Principles](#database-design-principles)
5. [Frontend Design Guidelines](#frontend-design-guidelines)
6. [Security Design Principles](#security-design-principles)
7. [Performance Design Guidelines](#performance-design-guidelines)
8. [User Experience (UX) Guidelines](#user-experience-ux-guidelines)
9. [Infrastructure Design Guidelines](#infrastructure-design-guidelines)
10. [DevOps Design Principles](#devops-design-principles)

## Architectural Principles

### Core Design Philosophy

Our architecture follows these fundamental principles:

#### 1. Separation of Concerns
```
Each service/component should have a single, well-defined responsibility
and minimal dependencies on other components.

✅ Good: User service handles only authentication and user management
❌ Bad: User service also handles payments and notifications
```

#### 2. High Cohesion, Low Coupling
```python
# High Cohesion - Related functionality grouped together
class UserService:
    def __init__(self):
        self.authenticator = Authenticator()
        self.user_repository = UserRepository()
        self.email_service = EmailService()

    def create_user(self, user_data):
        # All user-related operations in one place
        pass

# Low Coupling - Minimal dependencies between services
class ExerciseService:
    def __init__(self, user_service_url):
        self.user_client = UserClient(user_service_url)  # Interface, not direct dependency

    def submit_exercise(self, user_id, exercise_data):
        # Communicates via API, not direct database access
        pass
```

#### 3. Domain-Driven Design (DDD)
```python
# Domain entities represent business concepts
from dataclasses import dataclass
from datetime import datetime
from typing import List
from enum import Enum

class ExerciseStatus(Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class DifficultyLevel(Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

@dataclass
class Exercise:
    id: str
    title: str
    description: str
    difficulty: DifficultyLevel
    category: str
    status: ExerciseStatus
    created_by: str  # User ID
    created_at: datetime
    updated_at: datetime
    tags: List[str]

    # Domain logic within the entity
    def can_be_submitted_by(self, user_id: str) -> bool:
        """Business rule: Users can submit to published exercises only"""
        return self.status == ExerciseStatus.PUBLISHED

    def is_suitable_for_level(self, user_level: str) -> bool:
        """Business rule: Exercise difficulty matching"""
        return self.difficulty.value == user_level

# Value objects for complex concepts
@dataclass(frozen=True)
class TestResult:
    passed: bool
    execution_time: float
    memory_usage: float
    output: str
    error_message: str = ""

@dataclass(frozen=True)
class ExerciseSubmission:
    exercise_id: str
    user_id: str
    code: str
    language: str
    test_results: List[TestResult]
    submitted_at: datetime

    @property
    def score(self) -> int:
        """Calculate score based on test results"""
        passed_tests = sum(1 for result in self.test_results if result.passed)
        return (passed_tests / len(self.test_results)) * 100 if self.test_results else 0
```

### Architectural Patterns

#### 1. CQRS (Command Query Responsibility Segregation)
```python
# Command side - Write operations
class ExerciseCommandHandler:
    def __init__(self, exercise_repository, event_bus):
        self.exercise_repository = exercise_repository
        self.event_bus = event_bus

    def create_exercise(self, command: CreateExerciseCommand) -> str:
        exercise = Exercise.create(
            title=command.title,
            description=command.description,
            difficulty=command.difficulty,
            created_by=command.user_id
        )

        self.exercise_repository.save(exercise)
        self.event_bus.publish(ExerciseCreatedEvent(exercise.id, exercise.title))

        return exercise.id

# Query side - Read operations
class ExerciseQueryHandler:
    def __init__(self, exercise_read_repository):
        self.exercise_read_repository = exercise_read_repository

    def get_exercise_by_id(self, query: GetExerciseQuery) -> ExerciseDTO:
        return self.exercise_read_repository.find_by_id(query.exercise_id)

    def search_exercises(self, query: SearchExercisesQuery) -> List[ExerciseDTO]:
        return self.exercise_read_repository.search(
            difficulty=query.difficulty,
            category=query.category,
            page=query.page
        )

# Data Transfer Objects for queries
@dataclass
class ExerciseDTO:
    id: str
    title: str
    description: str
    difficulty: str
    category: str
    created_by_name: str  # Denormalized for query performance
    submission_count: int
    average_score: float
```

#### 2. Event-Driven Architecture
```python
from abc import ABC, abstractmethod
from typing import List
from dataclasses import dataclass
from datetime import datetime
import json

# Domain Events
@dataclass
class DomainEvent(ABC):
    event_id: str
    aggregate_id: str
    occurred_at: datetime
    version: int

@dataclass
class UserRegisteredEvent(DomainEvent):
    user_id: str
    email: str
    username: str

@dataclass
class ExerciseSubmittedEvent(DomainEvent):
    exercise_id: str
    user_id: str
    score: int
    language: str

@dataclass
class AchievementUnlockedEvent(DomainEvent):
    user_id: str
    achievement_id: str
    achievement_type: str

# Event Bus Interface
class EventBus(ABC):
    @abstractmethod
    def publish(self, event: DomainEvent):
        pass

    @abstractmethod
    def subscribe(self, event_type: type, handler):
        pass

# Event Handlers for different bounded contexts
class GamificationEventHandler:
    def __init__(self, achievement_service, notification_service):
        self.achievement_service = achievement_service
        self.notification_service = notification_service

    def handle_exercise_submitted(self, event: ExerciseSubmittedEvent):
        # Check for achievements when exercise is submitted
        achievements = self.achievement_service.check_achievements(
            event.user_id,
            event.score,
            event.exercise_id
        )

        for achievement in achievements:
            # Publish achievement unlocked event
            achievement_event = AchievementUnlockedEvent(
                event_id=str(uuid.uuid4()),
                aggregate_id=event.user_id,
                occurred_at=datetime.utcnow(),
                version=1,
                user_id=event.user_id,
                achievement_id=achievement.id,
                achievement_type=achievement.type
            )

            self.event_bus.publish(achievement_event)

    def handle_achievement_unlocked(self, event: AchievementUnlockedEvent):
        # Send notification for achievement
        self.notification_service.send_achievement_notification(
            event.user_id,
            event.achievement_id
        )

# Integration with message broker (e.g., RabbitMQ, Kafka)
class MessageBusEventBus(EventBus):
    def __init__(self, message_broker):
        self.message_broker = message_broker
        self.handlers = {}

    def publish(self, event: DomainEvent):
        event_data = {
            'event_id': event.event_id,
            'event_type': event.__class__.__name__,
            'aggregate_id': event.aggregate_id,
            'occurred_at': event.occurred_at.isoformat(),
            'version': event.version,
            'data': event.__dict__
        }

        self.message_broker.publish(
            routing_key=event.__class__.__name__,
            message=json.dumps(event_data)
        )

    def subscribe(self, event_type: type, handler):
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)
```

## Microservices Design

### Service Boundaries

#### 1. Business Capability Mapping
```
User Management Service
├── Authentication & Authorization
├── User Profile Management
├── User Preferences & Settings
└── Account Security (2FA, Password Reset)

Exercise Service
├── Exercise Creation & Management
├── Exercise Categories & Tags
├── Exercise Search & Discovery
└── Exercise Validation

Scoring Service
├── Score Calculation & Storage
├── Leaderboards & Rankings
├── Progress Tracking
└── Performance Analytics

Gateway Service
├── API Gateway & Routing
├── Rate Limiting & Throttling
├── Request/Response Transformation
└── Authentication Proxy
```

#### 2. Service Design Patterns
```python
# Service Template with common patterns
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import logging
from dataclasses import dataclass

class BaseService(ABC):
    """Base service with common functionality"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = logging.getLogger(self.__class__.__name__)
        self.health_checker = HealthChecker()

    @abstractmethod
    def initialize(self) -> bool:
        """Initialize service-specific resources"""
        pass

    def health_check(self) -> Dict[str, Any]:
        """Standard health check endpoint"""
        return self.health_checker.check_service_health(self)

    def shutdown(self):
        """Graceful shutdown"""
        self.logger.info(f"Shutting down {self.__class__.__name__}")

# Service Discovery Pattern
class ServiceRegistry:
    def __init__(self, consul_client):
        self.consul = consul_client

    def register_service(self, service_name: str, service_id: str,
                        host: str, port: int, health_check_url: str):
        """Register service with discovery"""
        self.consul.agent.service.register(
            name=service_name,
            service_id=service_id,
            address=host,
            port=port,
            check=consul.Check.http(f"http://{host}:{port}{health_check_url}",
                                   interval="10s")
        )

    def discover_service(self, service_name: str) -> Optional[str]:
        """Discover service endpoint"""
        services = self.consul.health.service(service_name, passing=True)[1]
        if services:
            service = services[0]
            return f"http://{service['Service']['Address']}:{service['Service']['Port']}"
        return None

# Circuit Breaker Pattern
from time import time, sleep
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED

    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerOpenException("Circuit breaker is open")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _should_attempt_reset(self):
        return (time() - self.last_failure_time) >= self.recovery_timeout

    def _on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

# Usage in service client
class ExerciseServiceClient:
    def __init__(self, service_registry: ServiceRegistry):
        self.service_registry = service_registry
        self.circuit_breaker = CircuitBreaker()

    def get_exercise(self, exercise_id: str):
        service_url = self.service_registry.discover_service("exercise-service")
        if not service_url:
            raise ServiceUnavailableException("Exercise service not found")

        return self.circuit_breaker.call(
            requests.get, f"{service_url}/exercises/{exercise_id}"
        )
```

### Data Consistency Patterns

#### 1. Saga Pattern for Distributed Transactions
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from enum import Enum
import uuid

class SagaStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    COMPENSATING = "compensating"

class SagaStep(ABC):
    @abstractmethod
    def execute(self, saga_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def compensate(self, saga_data: Dict[str, Any]) -> bool:
        pass

class CreateExerciseSaga:
    def __init__(self, exercise_service_client, scoring_service_client):
        self.steps = [
            CreateExerciseStep(exercise_service_client),
            InitializeScoringStep(scoring_service_client),
            UpdateLeaderboardStep(scoring_service_client)
        ]
        self.status = SagaStatus.PENDING
        self.executed_steps = []

    def execute(self, exercise_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute saga with compensation on failure"""
        self.status = SagaStatus.RUNNING
        saga_data = exercise_data.copy()

        try:
            for step in self.steps:
                result = step.execute(saga_data)
                saga_data.update(result)
                self.executed_steps.append(step)

            self.status = SagaStatus.COMPLETED
            return saga_data

        except Exception as e:
            self.status = SagaStatus.FAILED
            self._compensate(saga_data)
            raise e

    def _compensate(self, saga_data: Dict[str, Any]):
        """Execute compensation for executed steps"""
        self.status = SagaStatus.COMPENSATING

        for step in reversed(self.executed_steps):
            try:
                step.compensate(saga_data)
            except Exception as e:
                logging.error(f"Compensation failed for step {step.__class__.__name__}: {e}")

class CreateExerciseStep(SagaStep):
    def __init__(self, exercise_service_client):
        self.exercise_client = exercise_service_client

    def execute(self, saga_data: Dict[str, Any]) -> Dict[str, Any]:
        exercise = self.exercise_client.create_exercise({
            'title': saga_data['title'],
            'description': saga_data['description'],
            'difficulty': saga_data['difficulty']
        })
        return {'exercise_id': exercise['id'], 'exercise': exercise}

    def compensate(self, saga_data: Dict[str, Any]) -> bool:
        try:
            self.exercise_client.delete_exercise(saga_data['exercise_id'])
            return True
        except Exception:
            return False

class InitializeScoringStep(SagaStep):
    def __init__(self, scoring_service_client):
        self.scoring_client = scoring_service_client

    def execute(self, saga_data: Dict[str, Any]) -> Dict[str, Any]:
        score_config = self.scoring_client.initialize_scoring({
            'exercise_id': saga_data['exercise_id'],
            'scoring_rules': saga_data.get('scoring_rules', {})
        })
        return {'scoring_config_id': score_config['id']}

    def compensate(self, saga_data: Dict[str, Any]) -> bool:
        try:
            self.scoring_client.delete_scoring_config(
                saga_data.get('scoring_config_id')
            )
            return True
        except Exception:
            return False
```

## API Design Guidelines

### RESTful API Design

#### 1. Resource Modeling
```python
# Resource-based URL structure
"""
Users Resource:
GET    /api/v1/users              - List users (with pagination)
POST   /api/v1/users              - Create user
GET    /api/v1/users/{id}         - Get user by ID
PUT    /api/v1/users/{id}         - Update user (full update)
PATCH  /api/v1/users/{id}         - Update user (partial update)
DELETE /api/v1/users/{id}         - Delete user

Nested Resources:
GET    /api/v1/users/{id}/exercises     - Get user's exercises
POST   /api/v1/users/{id}/exercises     - Submit exercise for user
GET    /api/v1/users/{id}/scores        - Get user's scores
GET    /api/v1/users/{id}/achievements  - Get user's achievements

Exercises Resource:
GET    /api/v1/exercises              - List exercises (with filtering)
POST   /api/v1/exercises              - Create exercise
GET    /api/v1/exercises/{id}         - Get exercise by ID
PUT    /api/v1/exercises/{id}         - Update exercise
DELETE /api/v1/exercises/{id}         - Delete exercise

Sub-resources:
GET    /api/v1/exercises/{id}/submissions    - Get exercise submissions
POST   /api/v1/exercises/{id}/submit        - Submit solution
GET    /api/v1/exercises/{id}/test-cases    - Get test cases
"""

# Flask route implementation with proper HTTP methods
from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError

exercise_bp = Blueprint('exercises', __name__)

class ExerciseSchema(Schema):
    title = fields.Str(required=True, validate=lambda x: len(x) >= 3)
    description = fields.Str(required=True, validate=lambda x: len(x) >= 10)
    difficulty = fields.Str(required=True, validate=lambda x: x in ['beginner', 'intermediate', 'advanced'])
    category = fields.Str(required=True)
    tags = fields.List(fields.Str(), missing=[])

@exercise_bp.route('/exercises', methods=['GET'])
def list_exercises():
    """List exercises with filtering and pagination"""
    # Query parameters for filtering
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    difficulty = request.args.get('difficulty')
    category = request.args.get('category')
    search = request.args.get('search')

    # Build filter criteria
    filters = {}
    if difficulty:
        filters['difficulty'] = difficulty
    if category:
        filters['category'] = category
    if search:
        filters['search'] = search

    # Get exercises with pagination
    exercises, total = exercise_service.list_exercises(
        filters=filters,
        page=page,
        limit=limit
    )

    return jsonify({
        'data': [exercise_to_dict(ex) for ex in exercises],
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'pages': (total + limit - 1) // limit
        }
    })

@exercise_bp.route('/exercises', methods=['POST'])
def create_exercise():
    """Create new exercise"""
    try:
        # Validate input data
        schema = ExerciseSchema()
        exercise_data = schema.load(request.json)

        # Create exercise
        exercise = exercise_service.create_exercise(
            title=exercise_data['title'],
            description=exercise_data['description'],
            difficulty=exercise_data['difficulty'],
            category=exercise_data['category'],
            tags=exercise_data.get('tags', []),
            created_by=g.user_id  # From authentication middleware
        )

        return jsonify(exercise_to_dict(exercise)), 201

    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@exercise_bp.route('/exercises/<exercise_id>', methods=['GET'])
def get_exercise(exercise_id):
    """Get exercise by ID"""
    exercise = exercise_service.get_exercise_by_id(exercise_id)
    if not exercise:
        return jsonify({'error': 'Exercise not found'}), 404

    # Add user-specific information if authenticated
    exercise_dict = exercise_to_dict(exercise)
    if hasattr(g, 'user_id'):
        exercise_dict['user_submission_count'] = exercise_service.get_user_submission_count(
            exercise_id, g.user_id
        )
        exercise_dict['user_best_score'] = exercise_service.get_user_best_score(
            exercise_id, g.user_id
        )

    return jsonify(exercise_dict)

@exercise_bp.route('/exercises/<exercise_id>/submit', methods=['POST'])
def submit_exercise_solution(exercise_id):
    """Submit solution for exercise"""
    try:
        submission_data = {
            'code': request.json['code'],
            'language': request.json['language'],
            'user_id': g.user_id
        }

        result = scoring_service.submit_solution(exercise_id, submission_data)

        return jsonify({
            'submission_id': result['submission_id'],
            'score': result['score'],
            'test_results': result['test_results'],
            'execution_time': result['execution_time'],
            'memory_usage': result['memory_usage']
        })

    except Exception as e:
        return jsonify({'error': 'Submission failed', 'details': str(e)}), 500
```

#### 2. API Versioning Strategy
```python
# URL-based versioning (recommended for public APIs)
"""
/api/v1/users          - Version 1
/api/v2/users          - Version 2 (with breaking changes)
/api/v1.1/users       - Minor version (backward compatible)
"""

# Header-based versioning (for internal APIs)
"""
Accept: application/vnd.nt114.v1+json
Accept: application/vnd.nt114.v2+json
"""

# Flask implementation with versioning
from flask import Blueprint, request, jsonify

v1_bp = Blueprint('api_v1', __name__, url_prefix='/api/v1')
v2_bp = Blueprint('api_v2', __name__, url_prefix='/api/v2')

# Version 1 implementation
@v1_bp.route('/users/<user_id>')
def get_user_v1(user_id):
    user = user_service.get_user_by_id(user_id)
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'created_at': user.created_at.isoformat()
    })

# Version 2 implementation with additional fields
@v2_bp.route('/users/<user_id>')
def get_user_v2(user_id):
    user = user_service.get_user_by_id(user_id)
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'full_name': user.full_name,
        'profile_picture': user.profile_picture_url,
        'stats': {
            'exercises_completed': user.exercises_completed,
            'total_score': user.total_score,
            'rank': user.rank
        },
        'created_at': user.created_at.isoformat(),
        'updated_at': user.updated_at.isoformat()
    })

# Application factory that registers all versions
def create_app(config_name='development'):
    app = Flask(__name__)

    # Register API versions
    app.register_blueprint(v1_bp)
    app.register_blueprint(v2_bp)

    return app

# API Documentation with OpenAPI/Swagger
from flask_restx import Api, Resource, fields

api = Api(app, version='2.0', title='NT114 Exercise API',
          description='API for managing exercises and submissions')

# Model definitions for documentation
user_model = api.model('User', {
    'id': fields.String(description='User ID'),
    'username': fields.String(required=True, description='Username'),
    'email': fields.String(required=True, description='Email address'),
    'full_name': fields.String(description='Full name'),
    'stats': fields.Nested(api.model('UserStats', {
        'exercises_completed': fields.Integer(description='Number of completed exercises'),
        'total_score': fields.Integer(description='Total score across all exercises')
    }))
})

@api.route('/users/<string:user_id>')
class UserResource(Resource):
    @api.doc('get_user')
    @api.marshal_with(user_model)
    def get(self, user_id):
        """Get user by ID"""
        return user_service.get_user_by_id(user_id)
```

#### 3. Error Handling and Response Standards
```python
from flask import jsonify
from werkzeug.exceptions import HTTPException
import traceback
from datetime import datetime

class APIError(Exception):
    """Base API error class"""
    def __init__(self, message, status_code=400, payload=None):
        super().__init__()
        self.message = message
        self.status_code = status_code
        self.payload = payload

class ValidationError(APIError):
    """Validation error"""
    def __init__(self, message, field=None):
        super().__init__(message, 400)
        self.field = field

class NotFoundError(APIError):
    """Resource not found error"""
    def __init__(self, resource_type, resource_id):
        message = f"{resource_type} with ID {resource_id} not found"
        super().__init__(message, 404)

class UnauthorizedError(APIError):
    """Authentication/authorization error"""
    def __init__(self, message="Authentication required"):
        super().__init__(message, 401)

class RateLimitError(APIError):
    """Rate limit exceeded error"""
    def __init__(self, retry_after=None):
        message = "Rate limit exceeded. Please try again later."
        super().__init__(message, 429)
        self.retry_after = retry_after

# Error response format
def create_error_response(error, include_traceback=False):
    """Create standardized error response"""
    response = {
        'error': {
            'message': error.message,
            'type': error.__class__.__name__,
            'timestamp': datetime.utcnow().isoformat()
        }
    }

    # Add specific error details
    if hasattr(error, 'field') and error.field:
        response['error']['field'] = error.field

    if hasattr(error, 'payload') and error.payload:
        response['error'].update(error.payload)

    # Add traceback in development mode
    if include_traceback and hasattr(error, '__traceback__'):
        response['error']['traceback'] = traceback.format_exc()

    return response

# Global error handler
@app.errorhandler(Exception)
def handle_exception(e):
    """Handle all exceptions and return consistent error responses"""
    # Determine if we're in development mode
    include_traceback = app.config.get('DEBUG', False)

    # Handle known API errors
    if isinstance(e, APIError):
        response = create_error_response(e, include_traceback)
        return jsonify(response), e.status_code

    # Handle HTTP exceptions
    elif isinstance(e, HTTPException):
        api_error = APIError(e.description, e.code)
        response = create_error_response(api_error, include_traceback)
        return jsonify(response), e.code

    # Handle unknown exceptions
    else:
        app.logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
        api_error = APIError("Internal server error", 500)
        response = create_error_response(api_error, include_traceback)
        return jsonify(response), 500

# Success response format
def create_success_response(data=None, message=None, meta=None):
    """Create standardized success response"""
    response = {
        'success': True,
        'timestamp': datetime.utcnow().isoformat()
    }

    if data is not None:
        response['data'] = data

    if message:
        response['message'] = message

    if meta:
        response['meta'] = meta

    return response

# Usage in routes
@exercise_bp.route('/exercises/<exercise_id>', methods=['GET'])
def get_exercise(exercise_id):
    try:
        exercise = exercise_service.get_exercise_by_id(exercise_id)
        if not exercise:
            raise NotFoundError('Exercise', exercise_id)

        response = create_success_response(
            data=exercise_to_dict(exercise),
            message="Exercise retrieved successfully"
        )
        return jsonify(response)

    except APIError:
        raise  # Re-raise API errors to be handled by global handler
    except Exception as e:
        app.logger.error(f"Error retrieving exercise {exercise_id}: {str(e)}")
        raise APIError("Failed to retrieve exercise", 500)
```

## Database Design Principles

### Schema Design Guidelines

#### 1. Normalization vs. Performance Balance
```sql
-- Normalized structure (3NF) for data integrity
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL
);

CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    category VARCHAR(100) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_published BOOLEAN DEFAULT false NOT NULL,
    CONSTRAINT exercises_difficulty_check CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'))
);

CREATE TABLE exercise_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    execution_time DECIMAL(10,3),
    memory_usage INTEGER,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exercise_id, user_id, submitted_at)  -- Allow multiple submissions
);

-- Denormalized views for read performance
CREATE MATERIALIZED VIEW exercise_stats AS
SELECT
    e.id,
    e.title,
    e.difficulty,
    e.category,
    COUNT(es.id) as submission_count,
    AVG(es.score) as average_score,
    MAX(es.score) as max_score,
    COUNT(DISTINCT es.user_id) as unique_submitters,
    e.created_at
FROM exercises e
LEFT JOIN exercise_submissions es ON e.id = es.exercise_id
WHERE e.is_published = true
GROUP BY e.id, e.title, e.difficulty, e.category, e.created_at;

-- Refresh strategy for materialized view
CREATE OR REPLACE FUNCTION refresh_exercise_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY exercise_stats;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance optimization
CREATE INDEX idx_exercises_difficulty ON exercises(difficulty) WHERE is_published = true;
CREATE INDEX idx_exercises_category ON exercises(category) WHERE is_published = true;
CREATE INDEX idx_exercises_created_by ON exercises(created_by);
CREATE INDEX idx_exercise_submissions_exercise_id ON exercise_submissions(exercise_id);
CREATE INDEX idx_exercise_submissions_user_id ON exercise_submissions(user_id);
CREATE INDEX idx_exercise_submissions_score ON exercise_submissions(score) DESC;
CREATE INDEX idx_exercise_submissions_submitted_at ON exercise_submissions(submitted_at) DESC;

-- Composite indexes for common query patterns
CREATE INDEX idx_exercise_submissions_composite ON exercise_submissions(exercise_id, user_id, submitted_at DESC);
```

#### 2. Audit Trail and Temporal Data
```sql
-- Audit table for tracking changes
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address INET
);

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_values, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), OLD.updated_by);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), NEW.updated_by);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, operation, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), NEW.created_by);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER exercises_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON exercises
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Temporal table for historical data
CREATE TABLE exercise_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES exercises(id),
    version INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_published BOOLEAN NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(exercise_id, version)
);

-- Function to create new version
CREATE OR REPLACE FUNCTION create_exercise_version()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO exercise_versions (
        exercise_id, version, title, description, difficulty,
        category, is_published, created_by
    )
    SELECT
        NEW.id,
        COALESCE((SELECT MAX(version) FROM exercise_versions WHERE exercise_id = NEW.id), 0) + 1,
        NEW.title, NEW.description, NEW.difficulty, NEW.category,
        NEW.is_published, NEW.created_by;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exercise_version_trigger
    AFTER INSERT OR UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION create_exercise_version();
```

### Database Access Patterns

#### 1. Repository Pattern Implementation
```python
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Integer, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

Base = declarative_base()

class Exercise(Base):
    __tablename__ = 'exercises'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(String(20), nullable=False)
    category = Column(String(100), nullable=False)
    created_by = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    is_published = Column(Boolean, default=False)

class ExerciseRepository(ABC):
    """Abstract repository for exercise data access"""

    @abstractmethod
    def create(self, exercise_data: Dict[str, Any]) -> Exercise:
        pass

    @abstractmethod
    def find_by_id(self, exercise_id: str) -> Optional[Exercise]:
        pass

    @abstractmethod
    def find_all(self, filters: Dict[str, Any] = None,
                page: int = 1, limit: int = 20) -> List[Exercise]:
        pass

    @abstractmethod
    def update(self, exercise_id: str, update_data: Dict[str, Any]) -> Optional[Exercise]:
        pass

    @abstractmethod
    def delete(self, exercise_id: str) -> bool:
        pass

    @abstractmethod
    def count(self, filters: Dict[str, Any] = None) -> int:
        pass

class SQLExerciseRepository(ExerciseRepository):
    """SQL implementation of exercise repository"""

    def __init__(self, session: Session):
        self.session = session

    def create(self, exercise_data: Dict[str, Any]) -> Exercise:
        exercise = Exercise(**exercise_data)
        self.session.add(exercise)
        self.session.commit()
        self.session.refresh(exercise)
        return exercise

    def find_by_id(self, exercise_id: str) -> Optional[Exercise]:
        return self.session.query(Exercise).filter(Exercise.id == exercise_id).first()

    def find_all(self, filters: Dict[str, Any] = None,
                page: int = 1, limit: int = 20) -> List[Exercise]:
        query = self.session.query(Exercise)

        if filters:
            if 'difficulty' in filters:
                query = query.filter(Exercise.difficulty == filters['difficulty'])
            if 'category' in filters:
                query = query.filter(Exercise.category == filters['category'])
            if 'created_by' in filters:
                query = query.filter(Exercise.created_by == filters['created_by'])
            if 'is_published' in filters:
                query = query.filter(Exercise.is_published == filters['is_published'])
            if 'search' in filters:
                search_term = f"%{filters['search']}%"
                query = query.filter(
                    Exercise.title.ilike(search_term) |
                    Exercise.description.ilike(search_term)
                )

        # Pagination
        offset = (page - 1) * limit
        return query.offset(offset).limit(limit).all()

    def update(self, exercise_id: str, update_data: Dict[str, Any]) -> Optional[Exercise]:
        exercise = self.find_by_id(exercise_id)
        if exercise:
            for key, value in update_data.items():
                setattr(exercise, key, value)
            exercise.updated_at = datetime.utcnow()
            self.session.commit()
            self.session.refresh(exercise)
        return exercise

    def delete(self, exercise_id: str) -> bool:
        exercise = self.find_by_id(exercise_id)
        if exercise:
            self.session.delete(exercise)
            self.session.commit()
            return True
        return False

    def count(self, filters: Dict[str, Any] = None) -> int:
        query = self.session.query(Exercise)

        if filters:
            if 'difficulty' in filters:
                query = query.filter(Exercise.difficulty == filters['difficulty'])
            if 'category' in filters:
                query = query.filter(Exercise.category == filters['category'])
            if 'created_by' in filters:
                query = query.filter(Exercise.created_by == filters['created_by'])
            if 'is_published' in filters:
                query = query.filter(Exercise.is_published == filters['is_published'])
            if 'search' in filters:
                search_term = f"%{filters['search']}%"
                query = query.filter(
                    Exercise.title.ilike(search_term) |
                    Exercise.description.ilike(search_term)
                )

        return query.count()

# Repository factory with connection management
class DatabaseManager:
    def __init__(self, database_url: str):
        self.engine = create_engine(
            database_url,
            pool_size=20,
            max_overflow=30,
            pool_timeout=30,
            pool_recycle=3600
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

    def get_repository(self, repository_class: type):
        """Get repository instance with session management"""
        session = self.SessionLocal()
        return repository_class(session)

    def close_session(self, repository):
        """Close repository session"""
        if hasattr(repository, 'session'):
            repository.session.close()

# Usage in service layer
class ExerciseService:
    def __init__(self, database_manager: DatabaseManager):
        self.db_manager = database_manager

    def create_exercise(self, exercise_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        exercise_data['created_by'] = user_id
        exercise_data['created_at'] = datetime.utcnow()

        try:
            repository = self.db_manager.get_repository(SQLExerciseRepository)
            exercise = repository.create(exercise_data)

            # Map to domain object and return
            return {
                'id': str(exercise.id),
                'title': exercise.title,
                'description': exercise.description,
                'difficulty': exercise.difficulty,
                'category': exercise.category,
                'created_by': str(exercise.created_by),
                'created_at': exercise.created_at.isoformat(),
                'is_published': exercise.is_published
            }
        finally:
            self.db_manager.close_session(repository)
```

## Frontend Design Guidelines

### Component Architecture

#### 1. Atomic Design Pattern
```typescript
// Atoms - Smallest possible components
// src/components/atoms/Button/Button.tsx
import React from 'react';
import styled from 'styled-components';

export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

const StyledButton = styled.button<ButtonProps>`
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  transition: all 0.2s ease-in-out;

  /* Size variants */
  ${({ size }) => {
    switch (size) {
      case 'small':
        return `
          padding: 8px 16px;
          font-size: 14px;
        `;
      case 'medium':
        return `
          padding: 12px 24px;
          font-size: 16px;
        `;
      case 'large':
        return `
          padding: 16px 32px;
          font-size: 18px;
        `;
    }
  }}

  /* Color variants */
  ${({ variant, disabled }) => {
    if (disabled) {
      return `
        background-color: #e0e0e0;
        color: #9e9e9e;
        cursor: not-allowed;
      `;
    }

    switch (variant) {
      case 'primary':
        return `
          background-color: #1976d2;
          color: white;

          &:hover {
            background-color: #1565c0;
          }
        `;
      case 'secondary':
        return `
          background-color: transparent;
          color: #1976d2;
          border: 2px solid #1976d2;

          &:hover {
            background-color: #1976d2;
            color: white;
          }
        `;
      case 'danger':
        return `
          background-color: #d32f2f;
          color: white;

          &:hover {
            background-color: #c62828;
          }
        `;
    }
  }}

  &:focus {
    outline: 2px solid #1976d2;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  children,
  className,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      disabled={disabled || loading}
      onClick={onClick}
      className={className}
      {...props}
    >
      {loading ? <LoadingSpinner size="small" /> : children}
    </StyledButton>
  );
};

// Molecules - Groups of atoms working together
// src/components/molecules/ExerciseCard/ExerciseCard.tsx
import React from 'react';
import styled from 'styled-components';
import { Button } from '../../atoms/Button/Button';
import { DifficultyBadge } from '../../atoms/DifficultyBadge/DifficultyBadge';
import { UserAvatar } from '../../atoms/UserAvatar/UserAvatar';

export interface ExerciseCardProps {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  authorName: string;
  authorAvatar: string;
  submissionCount: number;
  averageScore: number;
  userBestScore?: number;
  onStartExercise: (id: string) => void;
  onViewDetails: (id: string) => void;
}

const CardContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 24px;
  margin-bottom: 16px;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
`;

const CardDescription = styled.p`
  margin: 0 0 16px 0;
  color: #666;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CardMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const CardAuthor = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CardStats = styled.div`
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #666;
`;

const CardActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  id,
  title,
  description,
  difficulty,
  category,
  authorName,
  authorAvatar,
  submissionCount,
  averageScore,
  userBestScore,
  onStartExercise,
  onViewDetails
}) => {
  return (
    <CardContainer>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <DifficultyBadge difficulty={difficulty} />
      </CardHeader>

      <CardDescription>{description}</CardDescription>

      <CardMeta>
        <CardAuthor>
          <UserAvatar src={authorAvatar} alt={authorName} size="small" />
          <span>{authorName}</span>
        </CardAuthor>

        <CardStats>
          <span>📊 {submissionCount} submissions</span>
          <span>⭐ {averageScore.toFixed(1)} avg score</span>
          {userBestScore && <span>🏆 {userBestScore} best</span>}
        </CardStats>
      </CardMeta>

      <CardActions>
        <Button
          variant="secondary"
          size="small"
          onClick={() => onViewDetails(id)}
        >
          View Details
        </Button>
        <Button
          variant="primary"
          size="small"
          onClick={() => onStartExercise(id)}
        >
          Start Exercise
        </Button>
      </CardActions>
    </CardContainer>
  );
};

// Organisms - Complex components composed of molecules and atoms
// src/components/organisms/ExerciseList/ExerciseList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { ExerciseCard } from '../../molecules/ExerciseCard/ExerciseCard';
import { SearchBar } from '../../molecules/SearchBar/SearchBar';
import { FilterPanel } from '../../molecules/FilterPanel/FilterPanel';
import { Pagination } from '../../molecules/Pagination/Pagination';
import { LoadingSpinner } from '../../atoms/LoadingSpinner/LoadingSpinner';
import { ErrorMessage } from '../../atoms/ErrorMessage/ErrorMessage';
import { exerciseService } from '../../../services/exerciseService';

const ListContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`;

const ListHeader = styled.div`
  margin-bottom: 24px;
`;

const ListTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 28px;
  font-weight: 700;
  color: #333;
`;

const ListControls = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
  }
`;

const ListContent = styled.div`
  min-height: 400px;
`;

const ListStats = styled.div`
  padding: 16px 0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 16px;
  color: #666;
  font-size: 14px;
`;

export const ExerciseList: React.FC = () => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalExercises, setTotalExercises] = useState(0);

  const [filters, setFilters] = useState({
    difficulty: '',
    category: '',
    search: ''
  });

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page: currentPage,
        limit: 20,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await exerciseService.fetchExercises(params);
      setExercises(response.data);
      setTotalPages(response.pagination.pages);
      setTotalExercises(response.pagination.total);
    } catch (err) {
      setError(err.message || 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleStartExercise = useCallback((exerciseId) => {
    // Navigate to exercise page
    window.location.href = `/exercises/${exerciseId}`;
  }, []);

  const handleViewDetails = useCallback((exerciseId) => {
    // Navigate to exercise details
    window.location.href = `/exercises/${exerciseId}/details`;
  }, []);

  return (
    <ListContainer>
      <ListHeader>
        <ListTitle>Exercises</ListTitle>
      </ListHeader>

      <ListControls>
        <SearchBar
          value={filters.search}
          onChange={(search) => handleFilterChange({ ...filters, search })}
          placeholder="Search exercises..."
        />
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
        />
      </ListControls>

      <ListContent>
        {loading && exercises.length === 0 && (
          <LoadingSpinner size="large" />
        )}

        {error && (
          <ErrorMessage
            message={error}
            onRetry={loadExercises}
          />
        )}

        {!loading && !error && exercises.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <h3>No exercises found</h3>
            <p>Try adjusting your filters or search criteria.</p>
          </div>
        )}

        {exercises.length > 0 && (
          <>
            <ListStats>
              Showing {exercises.length} of {totalExercises} exercises
            </ListStats>

            {exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                {...exercise}
                onStartExercise={handleStartExercise}
                onViewDetails={handleViewDetails}
              />
            ))}

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </ListContent>
    </ListContainer>
  );
};
```

#### 2. State Management Patterns
```typescript
// Context API with useReducer for global state
// src/contexts/ExerciseContext.tsx
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { exerciseService } from '../services/exerciseService';

// Types
export interface Exercise {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  authorName: string;
  authorAvatar: string;
  submissionCount: number;
  averageScore: number;
  userBestScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseState {
  exercises: Exercise[];
  currentExercise: Exercise | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
  filters: {
    difficulty: string;
    category: string;
    search: string;
  };
}

// Action types
type ExerciseAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_EXERCISES'; payload: Exercise[] }
  | { type: 'SET_CURRENT_EXERCISE'; payload: Exercise | null }
  | { type: 'SET_PAGINATION'; payload: Partial<ExerciseState['pagination']> }
  | { type: 'SET_FILTERS'; payload: Partial<ExerciseState['filters']> }
  | { type: 'ADD_EXERCISE'; payload: Exercise }
  | { type: 'UPDATE_EXERCISE'; payload: Exercise }
  | { type: 'REMOVE_EXERCISE'; payload: string };

// Initial state
const initialState: ExerciseState = {
  exercises: [],
  currentExercise: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20
  },
  filters: {
    difficulty: '',
    category: '',
    search: ''
  }
};

// Reducer
const exerciseReducer = (
  state: ExerciseState,
  action: ExerciseAction
): ExerciseState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case 'SET_EXERCISES':
      return {
        ...state,
        exercises: action.payload,
        loading: false,
        error: null
      };

    case 'SET_CURRENT_EXERCISE':
      return {
        ...state,
        currentExercise: action.payload,
        loading: false,
        error: null
      };

    case 'SET_PAGINATION':
      return {
        ...state,
        pagination: {
          ...state.pagination,
          ...action.payload
        }
      };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload
        }
      };

    case 'ADD_EXERCISE':
      return {
        ...state,
        exercises: [action.payload, ...state.exercises]
      };

    case 'UPDATE_EXERCISE':
      return {
        ...state,
        exercises: state.exercises.map(exercise =>
          exercise.id === action.payload.id ? action.payload : exercise
        ),
        currentExercise:
          state.currentExercise?.id === action.payload.id
            ? action.payload
            : state.currentExercise
      };

    case 'REMOVE_EXERCISE':
      return {
        ...state,
        exercises: state.exercises.filter(exercise => exercise.id !== action.payload),
        currentExercise:
          state.currentExercise?.id === action.payload ? null : state.currentExercise
      };

    default:
      return state;
  }
};

// Context
interface ExerciseContextType {
  state: ExerciseState;
  actions: {
    fetchExercises: (params?: any) => Promise<void>;
    fetchExercise: (id: string) => Promise<void>;
    createExercise: (data: any) => Promise<void>;
    updateExercise: (id: string, data: any) => Promise<void>;
    deleteExercise: (id: string) => Promise<void>;
    setFilters: (filters: Partial<ExerciseState['filters']>) => void;
    setPage: (page: number) => void;
    clearError: () => void;
  };
}

const ExerciseContext = createContext<ExerciseContextType | undefined>(undefined);

// Provider component
export const ExerciseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(exerciseReducer, initialState);

  // Actions
  const actions = {
    fetchExercises: async (params = {}) => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const response = await exerciseService.fetchExercises({
          page: state.pagination.page,
          limit: state.pagination.limit,
          ...state.filters,
          ...params
        });

        dispatch({ type: 'SET_EXERCISES', payload: response.data });
        dispatch({
          type: 'SET_PAGINATION',
          payload: {
            page: response.pagination.page,
            totalPages: response.pagination.pages,
            totalItems: response.pagination.total
          }
        });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
      }
    },

    fetchExercise: async (id: string) => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const exercise = await exerciseService.getExercise(id);
        dispatch({ type: 'SET_CURRENT_EXERCISE', payload: exercise });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
      }
    },

    createExercise: async (data: any) => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const exercise = await exerciseService.createExercise(data);
        dispatch({ type: 'ADD_EXERCISE', payload: exercise });
        return exercise;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    updateExercise: async (id: string, data: any) => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const exercise = await exerciseService.updateExercise(id, data);
        dispatch({ type: 'UPDATE_EXERCISE', payload: exercise });
        return exercise;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    deleteExercise: async (id: string) => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        await exerciseService.deleteExercise(id);
        dispatch({ type: 'REMOVE_EXERCISE', payload: id });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    setFilters: (filters: Partial<ExerciseState['filters']>) => {
      dispatch({ type: 'SET_FILTERS', payload: filters });
      // Reset to first page when filters change
      dispatch({ type: 'SET_PAGINATION', payload: { page: 1 } });
    },

    setPage: (page: number) => {
      dispatch({ type: 'SET_PAGINATION', payload: { page } });
    },

    clearError: () => {
      dispatch({ type: 'SET_ERROR', payload: null });
    }
  };

  return (
    <ExerciseContext.Provider value={{ state, actions }}>
      {children}
    </ExerciseContext.Provider>
  );
};

// Hook for consuming context
export const useExercise = () => {
  const context = useContext(ExerciseContext);
  if (context === undefined) {
    throw new Error('useExercise must be used within an ExerciseProvider');
  }
  return context;
};

// Custom hook for specific exercise operations
export const useExerciseActions = () => {
  const { actions } = useExercise();
  return actions;
};

export const useExerciseState = () => {
  const { state } = useExercise();
  return state;
};
```

This comprehensive design guidelines document provides detailed architectural principles, patterns, and best practices for all aspects of the NT114 DevSecOps project, ensuring consistency, scalability, and maintainability across the entire system.