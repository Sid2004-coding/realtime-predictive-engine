FROM python:3.10-slim

WORKDIR /app

# 1. Copy dependencies relative to the backend-ingest folder
COPY requirements.txt .

# 2. Install Python packages
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# 3. Copy the app folder into the container
COPY app/ ./app/

EXPOSE 8000

# 4. Run Uvicorn directly on the app module
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]