#!/bin/bash
set -e

echo "=== VeeTrack FastAPI Backend ==="

echo "Installing Python dependencies..."
pip install -r requirements.txt -q 2>/dev/null || pip install -r requirements.txt

echo "Downloading spaCy model..."
python -m spacy download en_core_web_sm 2>/dev/null || true

echo "Downloading NLTK data for sumy + TextBlob..."
python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('stopwords', quiet=True); nltk.download('punkt_tab', quiet=True)" 2>/dev/null || true
python -c "from textblob import download_corpora; download_corpora()" 2>/dev/null || true

echo "Starting FastAPI on http://localhost:8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level info
