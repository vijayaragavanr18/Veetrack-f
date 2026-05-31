"""
Intelligence router — /api/intelligence endpoint.

Produces a standardized intelligence report shape that matches
the frontend IntelligenceReport TypeScript interface exactly.
"""

from __future__ import annotations

import logging
from collections import Counter
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
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


def _generate_executive_brief(keyword: str, total: int, source_count: int,
                               dominant: str, counts: dict, risk_level: str) -> str:
    if total == 0:
        return (f'No significant coverage found for "{keyword}" in the requested period. '
                f'Media presence is low. Consider proactive content seeding to establish a baseline.')
    sent_desc = {
        "positive": "predominantly positive, indicating favorable media attention",
        "negative": "predominantly negative, suggesting adverse media attention that warrants attention",
        "neutral": "largely neutral, indicating balanced or factual reporting",
    }.get(dominant, "mixed")
    src_desc = f"across {source_count} diverse sources" if source_count >= 5 else f"from {source_count} sources"
    risk_desc = {
        "critical": "This constitutes a critical risk profile requiring immediate crisis management.",
        "high": "This represents elevated risk. Proactive monitoring and prepared responses are recommended.",
        "medium": "Risk is moderate. Continue monitoring for escalation.",
        "low": "Risk is low. Routine monitoring is sufficient.",
    }.get(risk_level, "")
    return (
        f'Intelligence analysis for "{keyword}" identified {total} articles {src_desc}. '
        f'Coverage is {sent_desc} '
        f'(positive: {counts.get("positive", 0)}, '
        f'negative: {counts.get("negative", 0)}, '
        f'neutral: {counts.get("neutral", 0)}). {risk_desc}'
    )


@router.post("/api/intelligence")
async def get_intelligence(req: IntelligenceRequest):
    """
    Generate a full intelligence report.

    Returns the standardized shape:
    {
      keyword, generatedAt, pipeline,
      report: { summary, keyFindings, suggestedAction, riskLevel, whyItMatters,
                executiveBrief, topEntities, sentimentBreakdown, riskScore,
                trendScore, hourlyVolume, totalArticles, sourceCount, sources },
      articles: [...]
    }
    """
    raw = await fetch_all_sources(req.keywords, days=req.days)
    articles = await process_articles(raw)

    keyword = req.keywords[0] if req.keywords else ""

    # ── Statistics ────────────────────────────────────────────
    by_source: dict[str, int] = {}
    for a in articles:
        src = a.get("source", a.get("origin", "unknown"))
        by_source[src] = by_source.get(src, 0) + 1

    sent_counts = Counter(a.get("sentiment", "neutral") for a in articles)
    dominant = (
        "positive" if sent_counts.get("positive", 0) > sent_counts.get("negative", 0)
        and sent_counts.get("positive", 0) > sent_counts.get("neutral", 0)
        else "negative" if sent_counts.get("negative", 0) > sent_counts.get("neutral", 0)
        else "neutral"
    )

    # Top entities with type
    entity_counter: Counter = Counter()
    entity_type_map: dict[str, str] = {}
    for a in articles:
        for e in a.get("entities", []):
            text = e.get("text", "")
            label = e.get("label", "Topic")
            type_map = {"ORG": "Organization", "PERSON": "Person", "GPE": "Location"}
            entity_counter[text] += 1
            entity_type_map[text] = type_map.get(label, "Topic")

    top_entities = [
        {"text": text, "type": entity_type_map.get(text, "Topic"), "count": count}
        for text, count in entity_counter.most_common(10)
        if text
    ]

    avg_risk = (
        sum(a.get("risk_score", 0) for a in articles) / len(articles)
        if articles else 0
    )
    avg_trend = (
        sum(a.get("trend_score", 0) for a in articles) / len(articles)
        if articles else 0
    )
    risk_level = _determine_risk_level(avg_risk)
    source_count = len(by_source)

    # Key findings from top articles
    key_findings = [
        a.get("why_it_matters", a.get("title", ""))
        for a in articles[:5] if a.get("title")
    ]

    # Executive brief
    executive_brief = _generate_executive_brief(
        keyword, len(articles), source_count, dominant, dict(sent_counts), risk_level
    )

    why_it_matters = {
        "critical": f'Coverage of "{keyword}" presents a critical risk profile. Immediate crisis management protocols should be activated.',
        "high": f'Coverage of "{keyword}" shows elevated risk. Proactive monitoring and prepared response strategies are recommended.',
        "medium": f'Coverage of "{keyword}" presents moderate risk. Continued monitoring is advised.',
    }.get(risk_level, f'Coverage of "{keyword}" shows low risk with stable sentiment. Standard monitoring is sufficient.')

    suggested_action = {
        "critical": "Activate crisis communication protocol immediately. Convene stakeholder briefing within 2 hours.",
        "high": "Escalate to senior communications team. Draft contingency messaging and prepare proactive statements.",
        "medium": "Maintain enhanced monitoring with daily briefings. Prepare draft responses for potential escalation.",
    }.get(risk_level, "Continue routine monitoring with weekly summary reports. No immediate action required.")

    # Hourly volume from trend engine (or zeros if Redis unavailable)
    try:
        from services.trend_engine import get_hourly_volume, record_keyword_volume
        hourly_volume = await get_hourly_volume(keyword)
        await record_keyword_volume(keyword, len(articles))
    except Exception:
        hourly_volume = [0] * 24

    return {
        "keyword": keyword,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "pipeline": "open_source",
        "report": {
            "summary": executive_brief,
            "keyFindings": key_findings,
            "suggestedAction": suggested_action,
            "riskLevel": risk_level,
            "whyItMatters": why_it_matters,
            "executiveBrief": executive_brief,
            "topEntities": top_entities,
            "sentimentBreakdown": {
                "positive": sent_counts.get("positive", 0),
                "negative": sent_counts.get("negative", 0),
                "neutral": sent_counts.get("neutral", 0),
            },
            "riskScore": round(avg_risk),
            "trendScore": round(avg_trend),
            "hourlyVolume": hourly_volume,
            "totalArticles": len(articles),
            "sourceCount": source_count,
            "sources": list(by_source.keys()),
        },
        "articles": articles,
    }


# ── Report Download Endpoints ─────────────────────────────────────


@router.get("/api/report/download/{client_id}")
async def download_report(client_id: str, date: str = None):
    """Download the latest PDF report for a client from Redis cache."""
    from core.redis_client import get_redis
    r = await get_redis()
    if not r:
        raise HTTPException(status_code=503, detail="Redis unavailable")
    if not date:
        date = datetime.utcnow().strftime("%Y-%m-%d")
    pdf_bytes = await r.get(f"report:{client_id}:{date}")
    if not pdf_bytes:
        raise HTTPException(status_code=404, detail="Report not generated yet for this date. POST /api/report/generate/{client_id} first.")
    raw = pdf_bytes if isinstance(pdf_bytes, bytes) else pdf_bytes.encode("latin-1")
    return Response(
        content=raw,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=VeeTrack_{client_id}_{date}.pdf"},
    )


@router.post("/api/report/generate/{client_id}")
async def trigger_report_now(client_id: str):
    """Manually trigger report generation for a client (requires Celery)."""
    try:
        from tasks.report_tasks import generate_and_send_report
        task = generate_and_send_report.delay(client_id)
        return {"status": "queued", "task_id": task.id, "client_id": client_id}
    except Exception as e:
        # If Celery not running, generate synchronously
        from services.report_generator import generate_daily_report_pdf
        from core.redis_client import get_redis
        from datetime import datetime

        today = datetime.utcnow().strftime("%Y-%m-%d")
        r = await get_redis()
        pdf_bytes = generate_daily_report_pdf(
            client_name=client_id.upper(),
            date=today,
            company_articles=[],
            competition_articles=[],
            industry_articles=[],
        )
        if r:
            await r.setex(f"report:{client_id}:{today}", 172800, pdf_bytes)
        return {"status": "generated_sync", "client_id": client_id, "note": str(e)}
