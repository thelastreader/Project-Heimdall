FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN sed '/^torch==/d; /^torchvision==/d' requirements.txt > /tmp/requirements.txt && \
    pip install --no-cache-dir torch==2.3.1+cpu torchvision==0.18.1+cpu \
      --index-url https://download.pytorch.org/whl/cpu \
      --extra-index-url https://pypi.org/simple && \
    pip install --no-cache-dir -r /tmp/requirements.txt

# Copy application
COPY . .

# Create data directories
RUN mkdir -p data/raw data/processed data/models data/uploads data/heatmaps data/reports

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# Builds the FastAPI runtime that serves Heimdall inference and reporting workflows.
