"""
VeeTrack — FastAPI application entry point.

Primary backend for the VeeTrack media intelligence platform.
Next.js is a thin proxy — all business logic lives here.

Routers:
  - feed        (POST /api/feed)
  - intelligence (POST /api/intelligence)
  - chat        (POST/DELETE /api/chat, POST /api/chat/ask)
  - reactions   (POST /api/reactions)
  - alerts      (GET /api/alerts — SSE)
"""

from __future__ import annotations

import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import alerts, chat, feed, intelligence, reactions

# ── Logging ──────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("veetrack")

# ── App Factory ──────────────────────────────────────────────────

app = FastAPI(
    title="VeeTrack API",
    description="Media Intelligence Platform — real-time news & social intelligence",
    version="1.0.0",
)

# ── CORS ─────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────

app.include_router(feed.router)
app.include_router(intelligence.router)
app.include_router(chat.router)
app.include_router(reactions.router)
app.include_router(alerts.router)


# ── Health Check ─────────────────────────────────────────────────


@app.get("/health")
async def health():
    """Basic health check endpoint."""
    return {"status": "ok", "service": "veetrack-backend", "version": "1.0.0"}


@app.get("/")
async def root():
    """Root endpoint with basic info."""
    return {
        "name": "VeeTrack",
        "version": "1.0.0",
        "description": "Media Intelligence Platform",
        "docs": "/docs",
        "health": "/health",
    }


# ── Entry Point ──────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
