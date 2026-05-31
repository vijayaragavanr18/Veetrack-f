"""
Trend engine — real-time trend scoring using pandas rolling windows + scipy zscore.

Stores per-keyword time series in memory (Redis later).
Records article ingestion events and computes trend scores
based on volume spikes and sentiment shifts.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timezone

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Per-keyword ingestion history (in-memory, Redis later)
_keyword_history: dict[str, list[dict]] = defaultdict(list)


def record_ingestion(
    keyword: str, article_count: int, avg_sentiment_score: float
) -> None:
    """
    Record an ingestion event for a keyword.
    Keeps only the last 7 days of data.
    """
    _keyword_history[keyword].append(
        {
            "timestamp": datetime.now(timezone.utc),
            "count": article_count,
            "avg_sentiment": avg_sentiment_score,
        }
    )
    # Keep only last 7 days
    cutoff = pd.Timestamp.now(tz="UTC") - pd.Timedelta(days=7)
    _keyword_history[keyword] = [
        r
        for r in _keyword_history[keyword]
        if pd.Timestamp(r["timestamp"]) > cutoff
    ]


def compute_trend_score_live(
    keyword: str, current_count: int, current_sentiment: float
) -> int:
    """
    Compute a 0-100 trend score for a keyword based on:
    - Volume spike (z-score against historical baseline) — 55% weight
    - Sentiment shift (deviation from recent average) — 45% weight

    Returns 30 if insufficient data (< 3 historical points).
    """
    history = _keyword_history.get(keyword, [])
    if len(history) < 3:
        return 30  # Not enough data yet

    df = pd.DataFrame(history)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp")

    # ── Volume spike z-score ─────────────────────────────────
    try:
        from scipy.stats import zscore

        if len(df) >= 5:
            counts = df["count"].values
            z = zscore(np.append(counts, current_count))
            volume_spike = min(100, max(0, int((z[-1] + 3) / 6 * 100)))
        else:
            mean = df["count"].mean()
            volume_spike = min(100, int((current_count / (mean + 1)) * 40))
    except Exception:
        volume_spike = 30

    # ── Sentiment shift ──────────────────────────────────────
    recent_sentiment = df["avg_sentiment"].tail(5).mean()
    sentiment_shift = abs(current_sentiment - recent_sentiment)
    sentiment_score = min(100, int(sentiment_shift * 200))

    # ── Composite trend score ────────────────────────────────
    trend = int(volume_spike * 0.55 + sentiment_score * 0.45)
    return min(100, max(0, trend))


def get_keyword_history(keyword: str) -> list[dict]:
    """Return ingestion history for a keyword."""
    return _keyword_history.get(keyword, [])


def get_all_keywords() -> list[str]:
    """Return all keywords with recorded history."""
    return list(_keyword_history.keys())
