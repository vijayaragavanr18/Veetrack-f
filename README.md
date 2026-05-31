# VeeTrack — AI Media Intelligence Platform

> Real-time media monitoring, sentiment analysis, and executive intelligence briefs powered entirely by open-source AI.

**By Vee Technologies, Salem, Tamil Nadu**

---

## Project Structure

```
veetrack-f1/                        ← Monorepo root
│
├── .env                            ← ✅ SINGLE env file for entire project
├── .env.example                    ← Template — copy to .env and fill values
├── .gitignore                      ← Single gitignore covering all sub-projects
├── requirements.txt                ← ✅ SINGLE Python dependency file
├── package.json                    ← Root scripts: dev:all, setup, kill, build
├── docker-compose.yml              ← Full stack: Redis + Backend + Frontend + Celery
├── Caddyfile                       ← Reverse proxy (for production/z.ai hosting)
│
├── scripts/                        ← All shell utilities
│   ├── setup.sh                    ← One-time install: Redis, Ollama, venv, npm
│   ├── start-backend.sh            ← Start FastAPI (loads root .env)
│   └── kill-ports.sh               ← Free ports 3000 and 8000
│
├── veetrack-backend/               ← FastAPI Python AI Engine (port 8000)
│   ├── main.py                     ← App entry — routers + Redis lifespan
│   ├── celery_app.py               ← Background task scheduler
│   ├── core/
│   │   └── redis_client.py         ← Async + sync Redis clients
│   ├── routers/
│   │   ├── feed.py                 ← POST /api/feed
│   │   ├── intelligence.py         ← POST /api/intelligence + report download
│   │   ├── chat.py                 ← POST /api/chat + /api/chat/ask
│   │   ├── reactions.py            ← POST /api/reactions
│   │   ├── alerts.py               ← GET  /api/alerts (SSE)
│   │   └── tracking_brief.py       ← GET/POST /api/tracking-brief
│   ├── services/
│   │   ├── ingestion.py            ← 5 async data source fetchers
│   │   ├── nlp_pipeline.py         ← Sentiment + NER + Summary + Risk + Cluster
│   │   ├── chat_engine.py          ← FAISS RAG + Ollama qwen2.5:1.5b
│   │   ├── alert_engine.py         ← 5 real signal threshold evaluators
│   │   ├── trend_engine.py         ← Redis time-series z-score scoring
│   │   └── report_generator.py     ← ReportLab PDF generator
│   └── tasks/
│       ├── ingestion_tasks.py      ← Celery: fetch articles every 15 min
│       ├── alert_tasks.py          ← Celery: evaluate thresholds every 15 min
│       └── report_tasks.py         ← Celery: email PDF reports at 8AM IST
│
└── veetrack-frontend/              ← Next.js 16 React SPA (port 3000)
    ├── .env.local                  ← Symlink → root .env (auto-created by setup)
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx            ← Root screen router
    │   │   ├── layout.tsx
    │   │   └── api/                ← Next.js route handlers (thin proxies to FastAPI)
    │   ├── screens/
    │   │   ├── KeywordInputScreen.tsx
    │   │   ├── FeedScreen.tsx      ← Flipboard swipe feed
    │   │   ├── ArticleDrillDown.tsx
    │   │   ├── IntelligenceScreen.tsx
    │   │   └── ClientBriefScreen.tsx
    │   ├── components/
    │   │   ├── FlipContainer.tsx   ← 3D Flipboard animation
    │   │   ├── FlipPage.tsx
    │   │   ├── alerts/             ← AlertBadge, AlertDrawer, AlertToast
    │   │   ├── chat/               ← ArticleChat
    │   │   ├── tabs/               ← KeyPoints, PublicReaction, Timeline
    │   │   └── ui/                 ← 10 shadcn components (pruned from 48)
    │   ├── hooks/
    │   │   ├── useAlertSocket.ts   ← SSE connection manager
    │   │   ├── use-mobile.ts
    │   │   └── use-toast.ts
    │   └── lib/
    │       ├── proxy.ts            ← FastAPI proxy helper
    │       ├── data/articles.ts    ← Article types + constants
    │       └── stores/
    │           ├── keyword-store.ts  ← Primary Zustand store
    │           ├── chat-store.ts
    │           └── alert-store.ts
    └── public/
```

---

## Quick Start

### 1. One-time setup (run once after cloning)

```bash
bash scripts/setup.sh
```

This installs: Redis, Ollama + qwen2.5:1.5b, Python venv, spaCy model, NLTK data, Node packages.

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env if needed — defaults work out of the box for local dev
```

### 3. Run the full stack

```bash
npm run dev:all
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Other commands

```bash
npm run setup       # Re-run one-time setup
npm run kill        # Free ports 3000 and 8000
npm run fresh       # Kill ports + start fresh
npm run lint        # Run ESLint on frontend
npm run build       # Production build
```

---

## Environment Variables

All configuration lives in a **single `.env` file at the project root**.

| Variable | Default | Description |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8000` | FastAPI backend URL (used by Next.js proxy) |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection string |
| `OLLAMA_URL` | `http://localhost:11434/api/generate` | Ollama API endpoint |
| `OLLAMA_MODEL` | `qwen2.5:1.5b` | Always 1.5B parameter model |
| `NEWSDATA_API_KEY` | *(empty)* | Optional backup news source |
| `SMTP_*` | *(empty)* | Email for daily PDF reports |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| **Animation** | Framer Motion (3D Flipboard), react-swipeable |
| **State** | Zustand with persist |
| **Backend** | FastAPI, Uvicorn, Python 3.12 |
| **AI Models** | Cardiff RoBERTa, spaCy en_core_web_trf, all-MiniLM-L6-v2, sumy TextRank, VADER |
| **LLM** | Ollama + qwen2.5:1.5b (local, offline-capable) |
| **Clustering** | HDBSCAN + FAISS |
| **Cache** | Redis (trend history, chat sessions, report cache) |
| **Tasks** | Celery + Redis (15-min ingestion, 8AM IST reports) |
| **Reports** | ReportLab PDF (Vee Technologies format) |
| **Proxy** | Caddy (for production deployment) |
| **Data Sources** | Google News RSS, GDELT, Hacker News, Mastodon, Wikipedia |

---

## Docker Deployment

```bash
docker compose up -d
```

This starts: Redis, FastAPI backend, Next.js frontend, Celery worker, Celery beat scheduler.

---

*VeeTrack — Zero paid APIs · Zero mock data · Fully open source · Runs offline after setup*
*Vee Technologies, Salem, Tamil Nadu*
