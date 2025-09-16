FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY project ./project
ENV PYTHONPATH=/app
EXPOSE 8000
CMD ["uvicorn", "project.main:app", "--host", "0.0.0.0", "--port", "8000"]
