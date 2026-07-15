FROM python:3.10-slim

WORKDIR /app

# 1. Copy dependencies first
COPY requirements.txt .

# 2. Install the backend python modules
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# 3. Copy only the internal app directory contents directly into /app
COPY . .

EXPOSE 8000

# 4. Clear command line target mapping
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]