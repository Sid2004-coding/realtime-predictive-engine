FROM python:3.10-slim

WORKDIR /app

# 1. Copy dependencies relative to the backend-ingest folder context
COPY requirements.txt .

# 2. Install Python packages
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# 3. Copy everything inside backend-ingest directly into /app
COPY . .

EXPOSE 8000

# 4. Run Uvicorn directly on the app module inside the container
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]