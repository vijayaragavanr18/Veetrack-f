"""
Trend engine — analyses patterns across articles to identify trending topics.

Uses keyword frequency, co-occurrence, and sentiment aggregation
to produce a list of TrendTopic objects.
"""

from __future__ import annotations

import logging
from collections import Counter, defaultdict
from typing import Optional

from models.schemas import (
    ArticleCard,
    SourceType,
    TrendTopic,
)

logger = logging.getLogger(__name__)


def compute_trends(
    articles: list[ArticleCard],
    max_topics: int = 20,
    min_count: int = 2,
) -> list[TrendTopic]:
    """
    Compute trending topics from a list of enriched articles.

    Strategy:
    1. Collect all keywords from all articles.
    2. Group articles by their top keyword.
    3. Compute aggregated sentiment, risk, and source diversity per topic.
    4. Sort by count (descending) and return top topics.
    """
    if not articles:
        return []

    # ── Build keyword → articles mapping ─────────────────────
    keyword_articles: dict[str, list[ArticleCard]] = defaultdict(list)

    for article in articles:
        for kw in article.keywords[:5]:  # use top 5 keywords per article
            keyword_articles[kw].append(article)

    # ── Compute trend stats ──────────────────────────────────
    trends: list[TrendTopic] = []

    for keyword, group in keyword_articles.items():
        count = len(group)
        if count < min_count:
            continue

        # Aggregated sentiment
        sentiments = [
            a.sentiment.score for a in group if a.sentiment is not None
        ]
        sentiment_avg = (
            sum(sentiments) / len(sentiments) if sentiments else 0.0
        )

        # Aggregated risk
        risk_avg = sum(a.risk_score for a in group) / count

        # Source diversity
        sources = list({a.source.value for a in group})

        # Sample articles (up to 3)
        sample = sorted(
            group,
            key=lambda a: a.published_at or a.fetched_at,
            reverse=True,
        )[:3]

        trends.append(
            TrendTopic(
                keyword=keyword,
                count=count,
                sentiment_avg=round(sentiment_avg, 3),
                risk_avg=round(risk_avg, 3),
                sources=sources,
                sample_articles=sample,
            )
        )

    # ── Sort by count then risk ──────────────────────────────
    trends.sort(key=lambda t: (t.count, t.risk_avg), reverse=True)

    return trends[:max_topics]


def compute_source_breakdown(
    articles: list[ArticleCard],
) -> dict[str, int]:
    """Return a count of articles per source."""
    counter: Counter = Counter()
    for a in articles:
        counter[a.source.value] += 1
    return dict(counter)


def compute_sentiment_distribution(
    articles: list[ArticleCard],
) -> dict[str, int]:
    """Return a count of articles per sentiment label."""
    counter: Counter = Counter()
    for a in articles:
        if a.sentiment:
            counter[a.sentiment.label.value] += 1
        else:
            counter["unknown"] += 1
    return dict(counter)


def compute_risk_distribution(
    articles: list[ArticleCard],
) -> dict[str, int]:
    """Return a count of articles per risk level."""
    counter: Counter = Counter()
    for a in articles:
        counter[a.risk_level.value] += 1
    return dict(counter)


def generate_summary(
    articles: list[ArticleCard],
    trends: list[TrendTopic],
) -> str:
    """Generate a short human-readable summary of the current feed state."""
    if not articles:
        return "No articles available for analysis."

    parts: list[str] = []

    # Source count
    source_breakdown = compute_source_breakdown(articles)
    source_str = ", ".join(f"{k}: {v}" for k, v in source_breakdown.items())
    parts.append(f"Analysed {len(articles)} articles ({source_str})")

    # Top trends
    if trends:
        top_kw = ", ".join(t.keyword for t in trends[:5])
        parts.append(f"Top trends: {top_kw}")

    # Risk overview
    risk_dist = compute_risk_distribution(articles)
    high_risk = risk_dist.get("high", 0) + risk_dist.get("critical", 0)
    if high_risk:
        parts.append(f"{high_risk} high/critical risk articles detected")

    # Sentiment
    sent_dist = compute_sentiment_distribution(articles)
    neg = sent_dist.get("negative", 0)
    if neg > len(articles) * 0.3:
        parts.append("Predominantly negative sentiment")

    return ". ".join(parts) + "."
