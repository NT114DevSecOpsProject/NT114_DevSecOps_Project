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
    
    # Register blueprints
    app.register_blueprint(auth_blueprint, url_prefix="/api/auth")
    app.register_blueprint(users_blueprint, url_prefix="/api/users")

    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health_check():
        return {'status': 'healthy', 'service': 'user-management-service'}, 200

    # Create tables
    with app.app_context():
        db.create_all()

    return app

# Create app instance
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)