#!/bin/bash

echo "🔧 Creating database schema..."

# Run a temporary pod to create database tables
kubectl run db-schema-creator --image=python:3.9 --rm -i --restart=Never \
  --env="DB_HOST=nt114-postgres-dev.cy7o684ygirj.us-east-1.rds.amazonaws.com" \
  --env="DB_PORT=5432" \
  --env="DB_NAME=auth_db" \
  --env="DB_USER=postgres" \
  --env="DB_PASSWORD=postgres" \
  --command='python3 -c "
import os
import psycopg2

try:
    conn = psycopg2.connect(
        host=os.environ.get(\"DB_HOST\"),
        port=os.environ.get(\"DB_PORT\"),
        database=os.environ.get(\"DB_NAME\"),
        user=os.environ.get(\"DB_USER\"),
        password=os.environ.get(\"DB_PASSWORD\")
    )
    cursor = conn.cursor()

    # Create users table if not exists
    cursor.execute(\"\"\"
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
        )
    \"\"\")
    print(\"✅ Users table created\")

    # Create exercises table
    cursor.execute(\"\"\"
        CREATE TABLE IF NOT EXISTS exercises (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            difficulty_level INTEGER DEFAULT 1,
            category VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    \"\"\")
    print(\"✅ Exercises table created\")

    # Create user_progress table
    cursor.execute(\"\"\"
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
    \"\"\")
    print(\"✅ User progress table created\")

    # Create scores table
    cursor.execute(\"\"\"
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
    \"\"\")
    print(\"✅ Scores table created\")

    conn.commit()
    print(\"✅ All database tables created successfully!\")

except Exception as e:
    print(f\"❌ Error creating tables: {e}\")
finally:
    if \"conn\" in locals():
        conn.close()
"'

echo "✅ Database schema creation completed!"
echo ""
echo "🔄 Restarting all pods to use new database schema..."
kubectl delete pods -n dev -l app.kubernetes.io/name --wait=false
echo ""
echo "🎯 Checking pod status..."
kubectl get pods -n dev