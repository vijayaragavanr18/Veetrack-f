FROM python:3.11-slim

WORKDIR /app

# Install build dependencies for some pip packages
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spacy and nltk models
RUN python -m spacy download en_core_web_sm
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('punkt_tab')"

# Copy backend code
COPY veetrack-backend/ ./veetrack-backend/

# Set working directory to backend
WORKDIR /app/veetrack-backend

# Expose port
EXPOSE 8000

# Start command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
