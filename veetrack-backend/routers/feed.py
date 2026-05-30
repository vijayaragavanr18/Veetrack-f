"""
Feed router — /api/feed endpoint that fetches from all 6 sources in parallel.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional

from fastapi import APIRouter, Query

from core.config import get_settings
from models.schemas import (
    ArticleCard,
    FeedResponse,
    SourceType,
)
from services.ingestion import (
    fetch_gdelt,
    fetch_hackernews,
    fetch_mastodon,
    fetch_rss,
    fetch_wikipedia,
    fetch_wikidata,
)
from services.nlp_pipeline import enrich_article
from services.alert_engine import evaluate_alert
from ws_manager import manager as ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["feed"])


@router.get("/feed", response_model=FeedResponse)
async def get_feed(
    query: Optional[str] = Query(None, description="Search query"),
    sources: Optional[str] = Query(None, description="Comma-separated source types"),
    limit: int = Query(50, ge=1, le=200, description="Max articles"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """
    Fetch and enrich articles from all 6 data sources in parallel.

    Sources: GDELT, RSS, Hacker News, Mastodon, Wikipedia, Wikidata
    """
    start = time.monotonic()
    settings = get_settings()

    # Parse requested sources
    source_filter: Optional[list[SourceType]] = None
    if sources:
        source_filter = []
        for s in sources.split(","):
            s = s.strip().lower()
            try:
                source_filter.append(SourceType(s))
            except ValueError:
                logger.warning("Unknown source type: %s", s)

    # ── Parallel fetch ───────────────────────────────────────
    fetch_tasks: list[asyncio.Task] = []

    async def _safe_fetch(coro, source_name: str):
        try:
            return await coro
        except Exception as exc:
            logger.error("Fetch %s failed: %s", source_name, exc)
            return []

    fetch_coroutines = []

    if source_filter is None or SourceType.GDELT in source_filter:
        fetch_coroutines.append(_safe_fetch(fetch_gdelt(query, limit, settings), "gdelt"))
    if source_filter is None or SourceType.RSS in source_filter:
        fetch_coroutines.append(_safe_fetch(fetch_rss(query, limit, settings), "rss"))
    if source_filter is None or SourceType.HACKERNEWS in source_filter:
        fetch_coroutines.append(_safe_fetch(fetch_hackernews(query, limit, settings), "hackernews"))
    if source_filter is None or SourceType.MASTODON in source_filter:
        fetch_coroutines.append(_safe_fetch(fetch_mastodon(query, limit, settings), "mastodon"))
    if source_filter is None or SourceType.WIKIPEDIA in source_filter:
        fetch_coroutines.append(_safe_fetch(fetch_wikipedia(query, limit, settings), "wikipedia"))
    if source_filter is None or SourceType.WIKIDATA in source_filter:
        fetch_coroutines.append(_safe_fetch(fetch_wikidata(query, limit, settings), "wikidata"))

    results = await asyncio.gather(*fetch_coroutines)

    # ── Merge and enrich ─────────────────────────────────────
    raw_articles = []
    for result in results:
        raw_articles.extend(result)

    # Sort by published_at (newest first)
    raw_articles.sort(
        key=lambda a: a.published_at or a.fetched_at,
        reverse=True,
    )

    # Enrich through NLP pipeline
    enriched: list[ArticleCard] = []
    for raw in raw_articles[offset : offset + limit]:
        card = enrich_article(raw)
        enriched.append(card)

        # Check for alerts and push via WebSocket
        alert = evaluate_alert(
            card,
            risk_threshold=settings.ALERT_RISK_THRESHOLD,
            sentiment_threshold=settings.ALERT_SENTIMENT_THRESHOLD,
        )
        if alert:
            await ws_manager.broadcast(alert.model_dump_json())

    elapsed_ms = (time.monotonic() - start) * 1000

    # Determine which sources were actually queried
    queried = (
        [s.value for s in source_filter]
        if source_filter
        else [s.value for s in SourceType]
    )

    return FeedResponse(
        articles=enriched,
        total=len(raw_articles),
        query=query,
        sources_queried=queried,
        elapsed_ms=round(elapsed_ms, 1),
    )


@router.post("/feed", response_model=FeedResponse)
async def post_feed(body: dict):
    """
    POST version of the feed endpoint for complex queries.
    Accepts JSON body with: query, sources, limit, offset.
    """
    query = body.get("query")
    sources_str = ",".join(body.get("sources", [])) if body.get("sources") else None
    limit = body.get("limit", 50)
    offset = body.get("offset", 0)

    return await get_feed(
        query=query,
        sources=sources_str,
        limit=limit,
        offset=offset,
    )
