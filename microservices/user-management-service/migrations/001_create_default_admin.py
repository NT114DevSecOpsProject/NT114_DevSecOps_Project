"""
Create default admin user
Email: admin@gmail.com
Password: 123456
"""
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.models import db, User
from app.logger import get_logger

logger = get_logger('migration_admin')

def create_default_admin():
    """Create default admin user if not exists"""
    app = create_app()

    with app.app_context():
        # Check if admin user already exists
        existing_admin = User.query.filter_by(email='admin@gmail.com').first()

        if existing_admin:
            logger.info("Admin user already exists, skipping creation")
            print("✓ Admin user already exists")
            return

        try:
            # Create admin user
            admin_user = User(
                username='admin',
                email='admin@gmail.com',
                password='123456',  # Will be hashed by User model
                admin=True,
                active=True
            )

            db.session.add(admin_user)
            db.session.commit()

            logger.info("Default admin user created successfully")
            print("✓ Default admin user created:")
            print(f"  Email: admin@gmail.com")
            print(f"  Password: 123456")
            print(f"  Admin: True")

        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to create admin user: {str(e)}")
            print(f"✗ Failed to create admin user: {str(e)}")
            raise

if __name__ == '__main__':
    create_default_admin()
