FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for WHOIS and Traceroute
RUN apt-get update && apt-get install -y \
    whois \
    traceroute \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the API port
EXPOSE 8080

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
