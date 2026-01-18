#!/bin/bash
# Entrypoint script for user-management-service
# Runs database migrations before starting the application

set -e

echo "=========================================="
echo "  User Management Service Starting"
echo "=========================================="
echo ""

# Wait for database to be ready
echo "Waiting for database to be ready..."
timeout=30
counter=0

until python -c "from app.models import db; from app import create_app; app = create_app(); app.app_context().push(); db.engine.connect()" 2>/dev/null; do
    counter=$((counter + 1))
    if [ $counter -gt $timeout ]; then
        echo "❌ Database connection timeout after ${timeout}s"
        exit 1
    fi
    echo "Database not ready yet... (${counter}/${timeout})"
    sleep 1
done

echo "✅ Database is ready"
echo ""

# Run database migrations
echo "Running database migrations..."
if [ -d "migrations" ]; then
    for migration in migrations/*.py; do
        if [ -f "$migration" ]; then
            echo "Running migration: $(basename $migration)"
            python "$migration" || {
                echo "❌ Migration failed: $migration"
                # Don't exit - let app try to start anyway
            }
        fi
    done
    echo "✅ Migrations completed"
else
    echo "⚠️  No migrations directory found, skipping"
fi
echo ""

# Start the application
echo "Starting application..."
echo "Command: $@"
echo ""

exec "$@"
