# Use a lightweight official Python image
FROM python:3.12-slim

# Set the working directory inside the container
WORKDIR /app

# Copy requirement files and install libraries
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application files (including the model file)
COPY . .

# Expose the API port
EXPOSE 8000

# Command to run the production server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]