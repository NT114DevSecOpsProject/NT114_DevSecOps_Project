FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Copy migrations and entrypoint
COPY migrations/ ./migrations/
COPY entrypoint.sh ./entrypoint.sh

# Create non-root user and group
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Make entrypoint executable and change ownership
RUN chmod +x /app/entrypoint.sh && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set environment variables
ENV FLASK_APP=app.main:app
ENV FLASK_ENV=development
ENV PYTHONPATH=/app

# Expose port
EXPOSE 5001

# Set entrypoint to run migrations before starting app
ENTRYPOINT ["/app/entrypoint.sh"]

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "1", "app.main:app"]