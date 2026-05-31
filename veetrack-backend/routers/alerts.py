"""
Alerts router — /api/alerts SSE endpoint.

Streams real-time alerts using Server-Sent Events.
Evaluates alert conditions every 30 seconds by fetching
recent articles and checking risk/sentiment thresholds.
"""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from services.ingestion import fetch_all_sources
from services.nlp_pipeline import process_articles

logger = logging.getLogger(__name__)

router = APIRouter()


async def evaluate_alerts(keywords: list[str]) -> list[dict]:
    """
    Fetch recent articles for keywords and evaluate alert conditions.
    Returns a list of alert dicts.
    """
    alerts: list[dict] = []
    if not keywords:
        return alerts

    try:
        articles = await fetch_all_sources(keywords, days=1)
        processed = await process_articles(articles)
    except Exception as e:
        logger.warning("[Alerts] Evaluation failed: %s", e)
        return alerts

    for article in processed:
        risk = article.get("risk_score", 0)
        sentiment = article.get("sentiment", "neutral")
        keyword = article.get("keyword", "")

        if risk >= 70 and sentiment == "negative":
            alerts.append(
                {
                    "type": "pr_risk",
                    "priority": "critical",
                    "keyword": keyword,
                    "headline": article.get("title", ""),
                    "risk_score": risk,
                    "message": f"High risk negative coverage detected for {keyword}",
                    "url": article.get("url", ""),
                }
            )
        elif risk >= 50:
            alerts.append(
                {
                    "type": "volume_spike",
                    "priority": "high",
                    "keyword": keyword,
                    "headline": article.get("title", ""),
                    "risk_score": risk,
                    "message": f"Elevated coverage activity for {keyword}",
                    "url": article.get("url", ""),
                }
            )

    return alerts[:5]


@router.get("/api/alerts")
async def alert_stream(request: Request, keywords: str = ""):
    """
    SSE endpoint for real-time alerts.
    Evaluates every 30 seconds and pushes alerts to connected clients.
    """
    keyword_list = [k.strip() for k in keywords.split(",") if k.strip()]

    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            try:
                alerts = await evaluate_alerts(keyword_list)
                if alerts:
                    for alert in alerts:
                        yield f"data: {json.dumps(alert)}\n\n"
                else:
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            await asyncio.sleep(30)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
