"""
Background alert tasks — periodic alert checking stubs.

These tasks periodically evaluate cached articles against alert thresholds
and push notifications to connected WebSocket clients.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from core.config import Settings, get_settings
from models.schemas import AlertPayload
from services.alert_engine import batch_evaluate
from tasks.ingestion_tasks import get_cached_articles
from ws_manager import manager as ws_manager

logger = logging.getLogger(__name__)

# ── Module-level state ───────────────────────────────────────

_alert_running: bool = False
_last_alert_check: Optional[datetime] = None
_alert_history: list[AlertPayload] = []


def get_alert_history() -> list[AlertPayload]:
    """Return the recent alert history."""
    return _alert_history


async def run_alert_cycle(
    risk_threshold: float = 0.7,
    sentiment_threshold: float = -0.6,
    settings: Optional[Settings] = None,
) -> list[AlertPayload]:
    """
    Execute one alert check cycle.

    Evaluates all cached articles against alert thresholds and broadcasts
    new alerts via WebSocket.
    """
    global _last_alert_check, _alert_history

    settings = settings or get_settings()
    articles = get_cached_articles()

    if not articles:
        logger.debug("No cached articles to evaluate for alerts")
        return []

    logger.info("Running alert cycle on %d articles", len(articles))

    # Evaluate alerts
    new_alerts = batch_evaluate(
        articles,
        risk_threshold=risk_threshold,
        sentiment_threshold=sentiment_threshold,
    )

    # Broadcast new alerts via WebSocket
    for alert in new_alerts:
        try:
            await ws_manager.broadcast(alert.model_dump_json())
        except Exception as exc:
            logger.error("Failed to broadcast alert: %s", exc)

    # Update history (keep last 100 alerts)
    _alert_history = (new_alerts + _alert_history)[:100]
    _last_alert_check = datetime.now(timezone.utc)

    logger.info("Alert cycle complete: %d alerts generated", len(new_alerts))
    return new_alerts


async def start_periodic_alerts(
    interval_seconds: int = 60,
    risk_threshold: float = 0.7,
    sentiment_threshold: float = -0.6,
) -> None:
    """
    Start a periodic alert-check loop that runs every `interval_seconds`.

    This is a long-running coroutine meant to be started as an asyncio task.
    """
    global _alert_running
    _alert_running = True
    logger.info("Periodic alert checking started (interval=%ds)", interval_seconds)

    while _alert_running:
        try:
            await run_alert_cycle(
                risk_threshold=risk_threshold,
                sentiment_threshold=sentiment_threshold,
            )
        except Exception as exc:
            logger.error("Alert cycle error: %s", exc)

        await asyncio.sleep(interval_seconds)


def stop_periodic_alerts() -> None:
    """Signal the periodic alert loop to stop."""
    global _alert_running
    _alert_running = False
    logger.info("Periodic alert checking stopping...")
