"""
Trend router — /api/trend endpoint for trend analysis.
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
    SourceType,
    TrendResponse,
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
from services.trend_engine import compute_trends, generate_summary

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["trend"])


@router.get("/trend", response_model=TrendResponse)
async def get_trend(
    query: Optional[str] = Query(None, description="Optional search query"),
    hours: int = Query(24, ge=1, le=168, description="Lookback window in hours"),
    limit: int = Query(50, ge=1, le=200, description="Max articles to analyse"),
):
    """
    Analyse trends across all 6 data sources.

    Returns trending topics with aggregated sentiment, risk, and source diversity.
    """
    start = time.monotonic()
    settings = get_settings()

    # ── Fetch from all sources ───────────────────────────────
    results = await asyncio.gather(
        _safe_fetch(fetch_gdelt(query, limit, settings), "gdelt"),
        _safe_fetch(fetch_rss(query, limit, settings), "rss"),
        _safe_fetch(fetch_hackernews(query, limit, settings), "hackernews"),
        _safe_fetch(fetch_mastodon(query, limit, settings), "mastodon"),
        _safe_fetch(fetch_wikipedia(query, limit, settings), "wikipedia"),
        _safe_fetch(fetch_wikidata(query, limit, settings), "wikidata"),
    )

    # ── Merge & enrich ───────────────────────────────────────
    raw_articles = []
    for result in results:
        raw_articles.extend(result)

    raw_articles.sort(
        key=lambda a: a.published_at or a.fetched_at,
        reverse=True,
    )

    enriched: list[ArticleCard] = [enrich_article(r) for r in raw_articles[:limit]]

    # ── Compute trends ───────────────────────────────────────
    trends = compute_trends(enriched, max_topics=20, min_count=2)

    elapsed_ms = (time.monotonic() - start) * 1000

    return TrendResponse(
        topics=trends,
        total_articles=len(enriched),
        hours=hours,
        query=query,
        elapsed_ms=round(elapsed_ms, 1),
    )


@router.get("/trend/summary")
async def get_trend_summary(
    query: Optional[str] = Query(None, description="Optional search query"),
    limit: int = Query(50, ge=1, le=200),
):
    """Return a concise text summary of current trends."""
    settings = get_settings()

    results = await asyncio.gather(
        _safe_fetch(fetch_gdelt(query, limit, settings), "gdelt"),
        _safe_fetch(fetch_rss(query, limit, settings), "rss"),
        _safe_fetch(fetch_hackernews(query, limit, settings), "hackernews"),
        _safe_fetch(fetch_mastodon(query, limit, settings), "mastodon"),
    )

    raw_articles = []
    for result in results:
        raw_articles.extend(result)

    enriched = [enrich_article(r) for r in raw_articles[:limit]]
    trends = compute_trends(enriched)
    summary = generate_summary(enriched, trends)

    return {"summary": summary, "article_count": len(enriched), "trend_count": len(trends)}


async def _safe_fetch(coro, name: str):
    """Wrapper to prevent a single source failure from breaking the whole request."""
    try:
        return await coro
    except Exception as exc:
        logger.error("Trend fetch %s failed: %s", name, exc)
        return []
