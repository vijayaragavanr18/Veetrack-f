<div align="center">
  <img src="https://via.placeholder.com/150x150/000000/FFFFFF?text=VeeTrack" alt="VeeTrack Logo" width="100"/>
  <h1>VeeTrack: AI Media Intelligence</h1>
  <p>An enterprise-grade, privacy-first media tracking and intelligence platform powered by local AI.</p>
</div>

---

## 📖 Overview

VeeTrack is a modern monorepo platform designed to ingest, process, and summarize massive amounts of global and industry-specific news in real time. It acts as an autonomous PR analyst by tracking news feeds, identifying named entities, scoring public sentiment, grouping identical narratives, and generating executive briefs.

Because privacy is paramount, **VeeTrack relies entirely on open-source AI models running locally on your own hardware**, eliminating the need for expensive and invasive cloud APIs (like OpenAI).

---

## 🚀 Key Features

*   **Multi-Source Real-time Ingestion:** Automatically pulls and normalizes data from Google News, GDELT, HackerNews, Mastodon, and top Indian Trade Media (Economic Times, Exchange4media, Inc42).
*   **Locally Hosted AI Pipeline (No Cloud APIs):**
    *   **Named Entity Recognition (NER):** Uses `spaCy` (en_core_web_trf/sm) to identify companies, locations, and executives.
    *   **Sentiment Analysis:** Uses Cardiff NLP's Twitter RoBERTa model to detect positive, negative, and neutral tones.
    *   **Content Deduplication:** Uses `datasketch` (MinHash LSH) to identify near-duplicate articles and reduce noise.
    *   **Narrative Clustering:** Groups thousands of articles into readable "trends" using `HDBSCAN` and `SentenceTransformers`.
*   **Executive Brief Generation:** Prompts a local Large Language Model (`qwen2.5:1.5b` via Ollama) to output strict, 4-bullet executive reports (What Happened, Why It Matters, Recommended Action, Risk Level).
*   **Modern 3D Interface:** A highly visual, gesture-driven frontend reader built with Next.js 15, React 19, and Tailwind CSS.
*   **Zero-Config Local Execution:** No heavy Docker requirements for local development.

---

## 🛠 Tech Stack

### Frontend (User Interface)
*   **Framework:** Next.js (App Router), React 19
*   **Styling:** Tailwind CSS v4, Lucide Icons
*   **Architecture:** Backend-For-Frontend (BFF) Proxy pattern (`/api/news`, `/api/chat`) to shield backend API keys and simplify client-side state.

### Backend (AI & Logic)
*   **Framework:** Python 3.12, FastAPI
*   **Databases:** Redis (for Celery background tasks & caching), FAISS (for vector retrieval during chat sessions).
*   **Task Queues:** Celery (background news fetching loop).
*   **Machine Learning:** PyTorch, HuggingFace Transformers, spaCy, scikit-learn.

---

## 💻 Getting Started (Local Development)

VeeTrack has been optimized to run completely natively on your machine without needing Docker.

### 1. Prerequisites
Ensure you have the following installed on your system:
*   **Python 3.10+** (and `pip`)
*   **Node.js 18+** (and `npm`)
*   **Redis** (Optional, if you want background Celery tasks to run)
*   **Ollama** (Optional, if you want LLM-generated executive summaries)

### 2. Environment Setup
Create a `.env` file in the root directory:

```env
# Network configuration (Crucial: Use 127.0.0.1 instead of localhost for Node IPv6 compatibility)
BACKEND_URL=http://127.0.0.1:8000
FRONTEND_URL=http://127.0.0.1:3000

# Optional: Local LLM Configuration
OLLAMA_URL=http://127.0.0.1:11434/api/generate
OLLAMA_MODEL=qwen2.5:1.5b
```

### 3. Installation & Boot Up
You can install dependencies and start both the FastAPI backend and the Next.js frontend concurrently with a single command:

```bash
# Installs Python venv, backend dependencies, frontend NPM packages, and boots the servers.
npm run fresh
```

*The first time you run this, the backend will automatically download the necessary HuggingFace NLP models to your local cache. This may take a few minutes depending on your internet connection.*

### 4. Access the Application
*   **Web App:** [http://localhost:3000](http://localhost:3000)
*   **Backend API Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 📂 Project Structure

```text
veetrack-f1/
├── package.json           # Root scripts (npm run fresh)
├── requirements.txt       # Unified Python dependencies
├── .env                   # Environment variables
├── veetrack-backend/      # Python FastAPI Microservice
│   ├── main.py            # API Entry Point
│   ├── routers/           # API endpoints (intelligence, chat, feed)
│   ├── services/          # Business logic & ML pipelines
│   └── tasks/             # Celery background workers
├── veetrack-frontend/     # Next.js Web App
│   ├── src/app/           # React Pages & API Proxy Routes
│   └── src/components/    # Reusable UI components
└── scripts/               # Helper bash scripts
```

---

*Built with ❤️ by Vee Technologies.*
