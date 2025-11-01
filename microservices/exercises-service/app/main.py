from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from sqlalchemy import text
from app.config import get_config
from app.models import db
from app.logger import setup_logger
from app.api.exercises import exercises_blueprint

def create_app():
    # Setup logging first
    setup_logger()
    
    # Create Flask app
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(get_config())
    
    # Initialize extensions
    db.init_app(app)
    Migrate(app, db)
    CORS(app)
    
    # Register blueprints
    app.register_blueprint(exercises_blueprint, url_prefix="/api/exercises")
    
    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        try:
            # Test database connection
            with db.engine.connect() as connection:
                connection.execute(text('SELECT 1'))
            return {"status": "healthy", "service": "exercises-service", "database": "connected"}, 200
        except Exception as e:
            return {"status": "unhealthy", "service": "exercises-service", "database": "disconnected", "error": str(e)}, 503
    
    # Create tables with error handling
    with app.app_context():
        try:
            db.create_all()
            print("Database tables created successfully")
        except Exception as e:
            print(f"Database connection failed: {e}")
            # Don't fail app startup if DB is not ready yet
    
    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)