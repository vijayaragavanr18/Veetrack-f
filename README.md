# VeeTrack: AI-Powered Media Intelligence Platform

VeeTrack is an enterprise-grade media intelligence platform designed to track, analyze, and summarize global news, social media trends, and industry-specific RSS feeds in real-time. By leveraging a completely localized suite of AI and NLP models, VeeTrack provides deep insights, sentiment scoring, and automated executive briefs while ensuring strict data privacy.

## Features

- **Multi-Source Ingestion:** Fetches real-time data from Google News, GDELT, Mastodon, HackerNews, and Indian Trade RSS Feeds.
- **Local AI Processing:** 
  - **Entity Extraction:** spaCy
  - **Deduplication:** MinHash LSH (datasketch)
  - **Sentiment Analysis:** Cardiff NLP RoBERTa
  - **Trend Clustering:** HDBSCAN & SentenceTransformers
- **Executive Briefs:** Generates strict 4-bullet summaries using local Ollama LLMs (qwen2.5:1.5b).
- **Modern UI:** A 3D, gesture-driven Next.js frontend with Tailwind CSS.
- **Native Local Execution:** Instantly spins up via a single `concurrently` command. No heavy Docker dependencies required for development.

## Prerequisites

- Python 3.10+
- Node.js 18+
- Redis (Optional, for Celery background tasks)
- Ollama (Optional, for LLM-based briefs)

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/najla1204/ai-powered-media-intelligence.git
   cd ai-powered-media-intelligence
   git checkout Veetrack-f1
   ```

2. **Configure Environment:**
   Create a `.env` file in the root directory:
   ```env
   BACKEND_URL=http://127.0.0.1:8000
   FRONTEND_URL=http://127.0.0.1:3000
   OLLAMA_URL=http://127.0.0.1:11434/api/generate
   OLLAMA_MODEL=qwen2.5:1.5b
   ```

3. **Install Dependencies & Run:**
   Run the following command to automatically install all frontend and backend dependencies and start both servers concurrently:
   ```bash
   npm install
   npm run fresh
   ```

4. **Access the Platform:**
   - Frontend: `http://localhost:3000`
   - Backend API Docs: `http://127.0.0.1:8000/docs`

## Architecture
VeeTrack is a decoupled monorepo. The Next.js frontend securely proxies requests to the highly asynchronous FastAPI backend, which orchestrates the complex AI data pipelines.
