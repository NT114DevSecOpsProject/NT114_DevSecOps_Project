import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection
conn = psycopg2.connect(
    host=os.environ.get('DB_HOST', 'nt114-postgres-dev.cy7o684ygirj.us-east-1.rds.amazonaws.com'),
    port=os.environ.get('DB_PORT', '5432'),
    database=os.environ.get('DB_NAME', 'auth_db'),
    user=os.environ.get('DB_USER', 'postgres'),
    password=os.environ.get('DB_PASSWORD', 'postgres')
)

try:
    cursor = conn.cursor()

    # Create exercises table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS exercises (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            difficulty_level INTEGER DEFAULT 1,
            category VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Exercises table created or already exists")

    # Create user_progress table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_progress (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            exercise_id INTEGER NOT NULL,
            completed BOOLEAN DEFAULT FALSE,
            score INTEGER DEFAULT 0,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (exercise_id) REFERENCES exercises(id),
            UNIQUE(user_id, exercise_id)
        )
    """)
    print("✅ User progress table created or already exists")

    # Create scores table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scores (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            exercise_id INTEGER NOT NULL,
            score INTEGER NOT NULL,
            max_score INTEGER DEFAULT 100,
            attempt_count INTEGER DEFAULT 1,
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (exercise_id) REFERENCES exercises(id)
        )
    """)
    print("✅ Scores table created or already exists")

    # Create users table if it doesn't exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
        )
    """)
    print("✅ Users table created or already exists")

    conn.commit()
    print("✅ All database tables created successfully!")

except Exception as e:
    print(f"❌ Error creating tables: {e}")
    conn.rollback()
finally:
    conn.close()