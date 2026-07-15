FROM python:3.10-slim

WORKDIR /app

# 1. Copy requirements relative to ml-worker context
COPY requirements.txt .

# 2. Install dependencies
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# 3. Copy everything in ml-worker directly into /app
COPY . .

EXPOSE 8000

# 4. Start the FastAPI application via server.py
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]