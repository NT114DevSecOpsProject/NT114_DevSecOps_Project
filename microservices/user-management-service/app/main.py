from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from app.config import get_config
from app.models import db, bcrypt
from app.logger import setup_logger
from app.api.auth import auth_blueprint
from app.api.users import users_blueprint

def create_app():
    # Setup logging first
    setup_logger()
    
    # Create Flask app
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(get_config())
    
    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    migrate = Migrate(app, db)
    CORS(app)
    
    # Health check endpoint - MUST be registered BEFORE any DB operations
    # This allows health checks to succeed even if DB is slow/unavailable during startup
    @app.route('/health', methods=['GET'])
    def health_check():
        return {'status': 'healthy', 'service': 'user-management-service'}, 200

    # Register blueprints
    app.register_blueprint(auth_blueprint, url_prefix="/api/auth")
    app.register_blueprint(users_blueprint, url_prefix="/api/users")

    # Lazy database initialization - only create tables on first request
    # This prevents blocking the health check endpoint during startup
    @app.before_request
    def initialize_database():
        """Initialize database tables on first request to avoid startup blocking"""
        if not hasattr(app, '_db_initialized'):
            try:
                with app.app_context():
                    db.create_all()
                app._db_initialized = True
                app.logger.info("Database tables initialized successfully")
            except Exception as e:
                app.logger.error(f"Database initialization failed: {e}")
                # Don't set _db_initialized to allow retry on next request
                # Health checks will still pass, allowing pod to stay alive

    return app

# Create app instance
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)