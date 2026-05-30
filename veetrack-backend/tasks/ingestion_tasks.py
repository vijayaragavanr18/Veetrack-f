"""
Background ingestion tasks — periodic data fetching stubs.

These are designed to be called from a background task runner or
the FastAPI lifespan. They fetch from all 6 sources on a schedule
and store results in the cache for quick retrieval.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from core.config import Settings, get_settings
from services.ingestion import (
    fetch_gdelt,
    fetch_hackernews,
    fetch_mastodon,
    fetch_rss,
    fetch_wikipedia,
    fetch_wikidata,
)
from services.nlp_pipeline import enrich_article
from models.schemas import ArticleCard

logger = logging.getLogger(__name__)

# ── Module-level state ───────────────────────────────────────

_ingestion_running: bool = False
_last_ingestion: Optional[datetime] = None
_cached_articles: list[ArticleCard] = []


def get_cached_articles() -> list[ArticleCard]:
    """Return the most recently cached articles."""
    return _cached_articles


async def run_ingestion_cycle(
    query: Optional[str] = None,
    limit: int = 50,
    settings: Optional[Settings] = None,
) -> list[ArticleCard]:
    """
    Execute one full ingestion cycle across all sources.

    This function is intended to be called periodically as a background task.
    It fetches from all 6 sources, enriches the results, and updates the
    internal cache.
    """
    global _last_ingestion, _cached_articles

    settings = settings or get_settings()
    logger.info("Starting ingestion cycle (query=%s, limit=%d)", query, limit)

    results = await asyncio.gather(
        fetch_gdelt(query, limit, settings),
        fetch_rss(query, limit, settings),
        fetch_hackernews(query, limit, settings),
        fetch_mastodon(query, limit, settings),
        fetch_wikipedia(query, limit, settings),
        fetch_wikidata(query, limit, settings),
        return_exceptions=True,
    )

    raw_articles = []
    for result in results:
        if isinstance(result, Exception):
            logger.error("Ingestion source failed: %s", result)
            continue
        raw_articles.extend(result)

    # Enrich all articles through the NLP pipeline
    enriched = [enrich_article(a) for a in raw_articles]

    # Sort by date (newest first)
    enriched.sort(
        key=lambda a: a.published_at or a.fetched_at,
        reverse=True,
    )

    # Update cache
    _cached_articles = enriched[:500]  # keep latest 500
    _last_ingestion = datetime.now(timezone.utc)

    logger.info(
        "Ingestion cycle complete: %d articles cached", len(_cached_articles)
    )
    return _cached_articles


async def start_periodic_ingestion(
    interval_seconds: int = 300,
    query: Optional[str] = None,
    limit: int = 50,
) -> None:
    """
    Start a periodic ingestion loop that runs every `interval_seconds`.

    This is a long-running coroutine meant to be started as an asyncio task.
    """
    global _ingestion_running
    _ingestion_running = True
    logger.info("Periodic ingestion started (interval=%ds)", interval_seconds)

    while _ingestion_running:
        try:
            await run_ingestion_cycle(query=query, limit=limit)
        except Exception as exc:
            logger.error("Ingestion cycle error: %s", exc)

        await asyncio.sleep(interval_seconds)


def stop_periodic_ingestion() -> None:
    """Signal the periodic ingestion loop to stop."""
    global _ingestion_running
    _ingestion_running = False
    logger.info("Periodic ingestion stopping...")
