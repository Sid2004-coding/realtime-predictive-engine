# 1. Use an official lightweight Python runtime environment layer
FROM python:3.10-slim

# 2. Set the working boundary directory context inside the container
WORKDIR /app

# 3. Copy the dependency registry definition mapping first to optimize caching
COPY backend-ingest/requirements.txt .

# 4. Install the backend python modules
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of the backend ingestion server application code files
COPY backend-ingest/ .

# 6. Expose the gateway network port mapping parameter
EXPOSE 8000

# 7. Start the FastAPI application server using Uvicorn
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]