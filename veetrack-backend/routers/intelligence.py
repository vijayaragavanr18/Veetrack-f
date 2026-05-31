"""
Intelligence router — /api/intelligence endpoint.

Produces a comprehensive intelligence report with
summary statistics, executive brief, and Wikidata facts.
"""

from __future__ import annotations

import logging
from collections import Counter
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from services.ingestion import fetch_all_sources
from services.nlp_pipeline import process_articles

logger = logging.getLogger(__name__)

router = APIRouter()


class IntelligenceRequest(BaseModel):
    keywords: list[str]
    days: int = 5


def _determine_risk_level(avg_risk: float) -> str:
    if avg_risk >= 70:
        return "critical"
    elif avg_risk >= 50:
        return "high"
    elif avg_risk >= 30:
        return "medium"
    return "low"


def _generate_overview(
    keyword: str, total: int, source_count: int,
    dominant: str, counts: dict,
) -> str:
    if total == 0:
        return f'No significant coverage found for "{keyword}" in the past 5 days.'

    sent_desc = {
        "positive": "predominantly positive, indicating favorable media attention",
        "negative": "predominantly negative, suggesting adverse media attention that warrants attention",
        "neutral": "largely neutral, indicating balanced or factual reporting",
    }.get(dominant, "mixed")

    src_desc = (
        f"across {source_count} diverse sources"
        if source_count >= 5
        else f"from {source_count} sources"
    )

    return (
        f'Intelligence analysis for "{keyword}" identified {total} articles '
        f"{src_desc}. Coverage sentiment is {sent_desc} "
        f"(positive: {counts.get('positive', 0)}, "
        f"negative: {counts.get('negative', 0)}, "
        f"neutral: {counts.get('neutral', 0)})."
    )


@router.post("/api/intelligence")
async def get_intelligence(req: IntelligenceRequest):
    """Generate a full intelligence report."""
    raw = await fetch_all_sources(req.keywords, days=req.days)
    articles = await process_articles(raw)

    # ── Summary statistics ─────────────────────────────────
    by_source: dict[str, int] = {}
    for a in articles:
        src = a.get("source", a.get("origin", "unknown"))
        by_source[src] = by_source.get(src, 0) + 1

    sent_counts = Counter(a.get("sentiment", "neutral") for a in articles)
    dominant = (
        "positive"
        if sent_counts.get("positive", 0) > sent_counts.get("negative", 0)
        and sent_counts.get("positive", 0) > sent_counts.get("neutral", 0)
        else "negative"
        if sent_counts.get("negative", 0) > sent_counts.get("neutral", 0)
        else "neutral"
    )

    top_entities: list[dict] = []
    entity_counter: Counter = Counter()
    for a in articles:
        for e in a.get("entities", []):
            entity_counter[e.get("text", "")] += 1
    for text, count in entity_counter.most_common(10):
        top_entities.append({"text": text, "count": count})

    avg_risk = (
        sum(a.get("risk_score", 0) for a in articles) / len(articles)
        if articles
        else 0
    )
    risk_level = _determine_risk_level(avg_risk)

    # ── Executive brief ────────────────────────────────────
    keyword = req.keywords[0] if req.keywords else ""
    source_count = len(by_source)
    overview = _generate_overview(keyword, len(articles), source_count, dominant, dict(sent_counts))
    key_developments = [a.get("title", "") for a in articles[:5]]

    why_map = {
        "critical": f'Coverage of "{keyword}" presents a critical risk profile. Immediate crisis management protocols should be activated.',
        "high": f'Coverage of "{keyword}" shows elevated risk. Proactive monitoring and prepared response strategies are recommended.',
        "medium": f'Coverage of "{keyword}" presents moderate risk. Continued monitoring is advised.',
    }
    why_it_matters = why_map.get(
        risk_level,
        f'Coverage of "{keyword}" shows low risk with stable sentiment. Standard monitoring is sufficient.',
    )

    action_map = {
        "critical": "Activate crisis communication protocol immediately. Convene stakeholder briefing within 2 hours.",
        "high": "Escalate to senior communications team. Draft contingency messaging and prepare proactive statements.",
        "medium": "Maintain enhanced monitoring with daily briefings. Prepare draft responses for potential escalation.",
    }
    recommended_action = action_map.get(
        risk_level,
        "Continue routine monitoring with weekly summary reports. No immediate action required.",
    )

    return {
        "keyword": keyword,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "articles": articles,
        "summary": {
            "totalFound": len(articles),
            "bySource": by_source,
            "sentimentBreakdown": dict(sent_counts),
            "topEntities": top_entities,
            "riskLevel": risk_level,
            "avgRiskScore": round(avg_risk, 1),
        },
        "executiveBrief": {
            "overview": overview,
            "keyDevelopments": key_developments,
            "whyItMatters": why_it_matters,
            "recommendedAction": recommended_action,
        },
        "wikidataFacts": None,
        "errors": [],
    }
