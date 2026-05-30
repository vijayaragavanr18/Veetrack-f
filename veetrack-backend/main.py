"""
VeeTrack — FastAPI application entry point.

Sets up:
- CORS middleware
- API routers (feed, reaction, trend)
- WebSocket endpoint for real-time alerts
- Health check endpoint
- Lifespan events (Redis, background tasks)
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from core.redis_client import init_redis, get_redis
from models.schemas import HealthResponse
from routers import feed, reaction, trend
from ws_manager import manager as ws_manager
from tasks.ingestion_tasks import start_periodic_ingestion, stop_periodic_ingestion
from tasks.alert_tasks import start_periodic_alerts, stop_periodic_alerts

# ── Logging ──────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("veetrack")

# ── Background task handles ──────────────────────────────────

_ingestion_task: asyncio.Task | None = None
_alert_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — startup and shutdown logic."""
    global _ingestion_task, _alert_task

    settings = get_settings()
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)

    # ── Startup ──────────────────────────────────────────────
    # Connect to Redis (graceful fallback if unavailable)
    await init_redis(settings.REDIS_URL)
    redis = get_redis()
    redis_status = "connected" if redis and redis.available else "unavailable"
    logger.info("Redis: %s", redis_status)

    # Start background tasks
    _ingestion_task = asyncio.create_task(
        start_periodic_ingestion(interval_seconds=300)
    )
    _alert_task = asyncio.create_task(
        start_periodic_alerts(interval_seconds=60)
    )

    yield

    # ── Shutdown ─────────────────────────────────────────────
    logger.info("Shutting down…")
    stop_periodic_ingestion()
    stop_periodic_alerts()

    if _ingestion_task and not _ingestion_task.done():
        _ingestion_task.cancel()
    if _alert_task and not _alert_task.done():
        _alert_task.cancel()

    # Close Redis
    if redis:
        await redis.close()

    logger.info("Shutdown complete")


# ── App factory ──────────────────────────────────────────────

app = FastAPI(
    title="VeeTrack",
    description="Media Intelligence Platform — real-time news & social intelligence",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────

app.include_router(feed.router)
app.include_router(reaction.router)
app.include_router(trend.router)


# ── Health check ─────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Basic health check endpoint."""
    redis = get_redis()
    redis_status = "connected" if redis and redis.available else "unavailable"
    return HealthResponse(
        status="ok",
        version="1.0.0",
        redis=redis_status,
    )


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


# ── WebSocket endpoint ──────────────────────────────────────


@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    WebSocket endpoint for real-time alert streaming.

    Clients connect to ws://host/ws/alerts and receive
    JSON alert payloads as they are generated.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive — client can also send ping
            data = await websocket.receive_text()
            if data == "ping":
                await ws_manager.send_personal(websocket, "pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception:
        await ws_manager.disconnect(websocket)
