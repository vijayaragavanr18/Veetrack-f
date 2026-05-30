"""
Alert engine — generates alerts based on risk thresholds and sentiment.

Alerts are pushed to connected WebSocket clients in real time.
"""

from __future__ import annotations

import logging
from typing import Optional

from models.schemas import (
    AlertPayload,
    AlertSeverity,
    ArticleCard,
    RiskLevel,
    SentimentLabel,
)

logger = logging.getLogger(__name__)

# ── Thresholds ───────────────────────────────────────────────

_RISK_THRESHOLDS: dict[RiskLevel, AlertSeverity] = {
    RiskLevel.CRITICAL: AlertSeverity.CRITICAL,
    RiskLevel.HIGH: AlertSeverity.WARNING,
    RiskLevel.MEDIUM: AlertSeverity.INFO,
    RiskLevel.LOW: AlertSeverity.INFO,
}

_SENTINEL_KEYWORDS = {
    "critical": AlertSeverity.CRITICAL,
    "emergency": AlertSeverity.CRITICAL,
    "outage": AlertSeverity.WARNING,
    "breach": AlertSeverity.CRITICAL,
    "attack": AlertSeverity.WARNING,
    "recall": AlertSeverity.WARNING,
    "crisis": AlertSeverity.WARNING,
    "shutdown": AlertSeverity.WARNING,
    "layoff": AlertSeverity.WARNING,
    "hack": AlertSeverity.CRITICAL,
}


def evaluate_alert(
    article: ArticleCard,
    risk_threshold: float = 0.7,
    sentiment_threshold: float = -0.6,
) -> Optional[AlertPayload]:
    """
    Evaluate an article against alert thresholds.
    Returns an AlertPayload if the article triggers an alert, else None.
    """
    # Skip low-risk items immediately
    if article.risk_score < risk_threshold and (
        article.sentiment is None or article.sentiment.score > sentiment_threshold
    ):
        # Check for sentinel keywords even if thresholds not met
        title_lower = article.title.lower()
        body_lower = article.body.lower()
        combined = title_lower + " " + body_lower

        keyword_severity: Optional[AlertSeverity] = None
        for kw, sev in _SENTINEL_KEYWORDS.items():
            if kw in combined:
                keyword_severity = sev
                break

        if keyword_severity is None:
            return None

        # Only alert on keyword match if severity is at least WARNING
        if keyword_severity == AlertSeverity.INFO:
            return None

        return _build_alert(article, keyword_severity)

    # Determine severity from risk level
    severity = _RISK_THRESHOLDS.get(article.risk_level, AlertSeverity.INFO)

    # Upgrade if sentiment is very negative
    if (
        article.sentiment
        and article.sentiment.label == SentimentLabel.NEGATIVE
        and article.sentiment.score < -0.5
    ):
        if severity == AlertSeverity.INFO:
            severity = AlertSeverity.WARNING
        elif severity == AlertSeverity.WARNING:
            severity = AlertSeverity.CRITICAL

    return _build_alert(article, severity)


def _build_alert(article: ArticleCard, severity: AlertSeverity) -> AlertPayload:
    """Construct an AlertPayload from an article and severity level."""
    message_parts: list[str] = []

    if article.sentiment:
        message_parts.append(
            f"Sentiment: {article.sentiment.label.value} ({article.sentiment.score:.2f})"
        )
    message_parts.append(f"Risk: {article.risk_level.value} ({article.risk_score:.2f})")

    if article.entities:
        top_entities = ", ".join(e.text for e in article.entities[:3])
        message_parts.append(f"Entities: {top_entities}")

    if article.keywords:
        message_parts.append(f"Keywords: {', '.join(article.keywords[:5])}")

    message = " | ".join(message_parts)

    return AlertPayload(
        severity=severity,
        title=article.title[:200],
        message=message,
        risk_score=article.risk_score,
        source=article.source.value,
        article_url=article.url,
    )


def batch_evaluate(
    articles: list[ArticleCard],
    risk_threshold: float = 0.7,
    sentiment_threshold: float = -0.6,
) -> list[AlertPayload]:
    """Evaluate a batch of articles and return all generated alerts."""
    alerts: list[AlertPayload] = []
    for article in articles:
        alert = evaluate_alert(article, risk_threshold, sentiment_threshold)
        if alert:
            alerts.append(alert)
    return alerts
