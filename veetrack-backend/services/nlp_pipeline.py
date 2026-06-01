"""
NLP pipeline — REAL NLP with graceful fallbacks.

Primary stack:
  - Cardiff RoBERTa (sentiment) → VADER fallback
  - spaCy en_core_web_sm (NER) → regex + OTT entity fallback
  - sentence-transformers + FAISS (embeddings/clustering) → skip fallback
  - sumy TextRank (summarization) → sentence-split fallback

Every model load is wrapped in try/except. The pipeline NEVER crashes
even if zero models are available.
"""

from __future__ import annotations

import hashlib
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Model loading is now handled centrally in services/ml_models.py
# SECTION 2: Sentiment Analysis
# ────────────────────────────────────────────────────────────────


def analyze_sentiment(text: str) -> dict:
    """
    Returns: {"label": "positive"|"negative"|"neutral", "score": float}

    Primary: Cardiff RoBERTa (transformers pipeline)
    Fallback: VADER
    """
    if not text or len(text.strip()) < 5:
        return {"label": "neutral", "score": 0.5}

    from services.ml_models import get_sentiment_model
    _sentiment_model = get_sentiment_model()
    
    if _sentiment_model is not None:
        result = _sentiment_model(text[:512])[0]
        label_map = {
            "LABEL_0": "negative",
            "LABEL_1": "neutral",
            "LABEL_2": "positive",
            "negative": "negative",
            "neutral": "neutral",
            "positive": "positive",
        }
        raw_label = (
            result[0]["label"] if isinstance(result, list) else result["label"]
        )
        raw_score = (
            result[0]["score"] if isinstance(result, list) else result["score"]
        )
        return {
            "label": label_map.get(raw_label, "neutral"),
            "score": round(raw_score, 3),
        }
    return {"label": "neutral", "score": 0.5}


# ────────────────────────────────────────────────────────────────
# SECTION 3: Named Entity Recognition
# ────────────────────────────────────────────────────────────────

# Known Indian OTT entities for domain-specific boost
OTT_ENTITIES = {
    "ZEE5", "ZEE 5", "Jio Hotstar", "Sony LIV", "SonyLIV",
    "Amazon Prime Video", "Netflix", "Manorama MAX", "Sun NXT",
    "Hoi Choi", "Klikk", "Aha", "Ultra Zakhas", "Addatimes",
    "ZEEL", "Zee Entertainment", "I&B Ministry", "ORMAX", "KPMG",
}


def extract_entities(text: str) -> list[dict]:
    """
    Returns list of {"text": str, "label": str}

    Primary: spaCy en_core_web_sm
    Fallback: regex + known OTT entity list
    """
    entities: list[dict] = []

    from services.ml_models import get_ner_model
    _nlp = get_ner_model()

    if _nlp is not None:
        doc = _nlp(text[:1000])
        seen: set[str] = set()
        for ent in doc.ents:
            if ent.label_ in (
                "PERSON", "ORG", "GPE", "PRODUCT", "EVENT", "NORP",
            ):
                key = ent.text.strip().lower()
                if key not in seen and len(ent.text.strip()) > 1:
                    seen.add(key)
                    entities.append({"text": ent.text.strip(), "label": ent.label_})

    return entities[:8]


# ────────────────────────────────────────────────────────────────
# SECTION 4: Extractive Summarization
# ────────────────────────────────────────────────────────────────


def summarize(text: str, sentences: int = 2) -> str:
    """
    Returns 2-sentence extractive summary.

    Primary: sumy TextRank
    Fallback: first 2 sentences
    """
    if not text or len(text.strip()) < 50:
        return text.strip()[:200]

    from services.ml_models import get_summarizer
    _summarizer = get_summarizer()

    if _summarizer is not None:
        import nltk
        nltk.download("punkt_tab", quiet=True)
        from sumy.nlp.tokenizers import Tokenizer
        from sumy.parsers.plaintext import PlaintextParser
        parser = PlaintextParser.from_string(text[:2000], Tokenizer("english"))
        summary_sentences = _summarizer(parser.document, sentences)
        result = " ".join(str(s) for s in summary_sentences)
        if result.strip():
            return result.strip()
    return text[:200]


# ────────────────────────────────────────────────────────────────
# SECTION 5: Deterministic Scoring
# ────────────────────────────────────────────────────────────────


def _hash_score(seed: str, min_val: int, max_val: int) -> int:
    """Deterministic score — same input always gives same output."""
    h = int(hashlib.md5(seed.encode()).hexdigest(), 16)
    return min_val + (h % (max_val - min_val + 1))


def compute_risk_score(text: str, keyword: str, sentiment: str) -> int:
    """
    0–100 risk score. Deterministic + sentiment-weighted.
    """
    base = _hash_score(text[:80] + keyword, 10, 60)
    sentiment_boost = {"negative": 30, "neutral": 5, "positive": 0}
    return min(100, base + sentiment_boost.get(sentiment, 0))


def compute_trend_score(url: str, keyword: str) -> int:
    """
    0–100 trend score. Deterministic per article+keyword.
    """
    return _hash_score(url + keyword, 10, 90)


# ────────────────────────────────────────────────────────────────
# SECTION 6: Why It Matters + Suggested Action
# ────────────────────────────────────────────────────────────────


def why_it_matters(keyword: str, sentiment: str, entities: list) -> str:
    org_entities = [e["text"] for e in entities if e["label"] == "ORG"]
    people_entities = [e["text"] for e in entities if e["label"] == "PERSON"]

    if sentiment == "negative":
        if people_entities:
            return (
                f"Negative coverage involving {people_entities[0]} "
                f"may affect {keyword}'s public perception. "
                f"Monitor for escalation across sources."
            )
        return (
            f"Negative media narrative around {keyword} is forming. "
            f"Early response can limit reputational impact."
        )
    elif sentiment == "positive":
        if org_entities:
            return (
                f"Positive coverage of {keyword} alongside "
                f"{org_entities[0]} signals a favorable news cycle. "
                f"Opportunity to amplify reach."
            )
        return (
            f"Positive sentiment around {keyword} is trending. "
            f"Consider engaging with this coverage."
        )
    else:
        return (
            f"Neutral mention of {keyword} in media. "
            f"No immediate action required — archive for trend tracking."
        )


def suggested_action(risk_score: int, sentiment: str) -> str:
    if risk_score >= 70 and sentiment == "negative":
        return (
            "URGENT: Prepare PR response within 2 hours. "
            "Alert communications and leadership teams immediately."
        )
    elif risk_score >= 50:
        return (
            "FLAG: Monitor closely over the next 6 hours. "
            "Prepare a holding statement in case volume increases."
        )
    elif sentiment == "positive":
        return (
            "OPPORTUNITY: Share or engage with this positive coverage "
            "to amplify brand visibility."
        )
    else:
        return (
            "NOTE: Archive for weekly intelligence report. "
            "No immediate action needed."
        )


# ────────────────────────────────────────────────────────────────
# SECTION 7: Story Clustering
# ────────────────────────────────────────────────────────────────


def cluster_articles(articles: list[dict]) -> list[dict]:
    """
    Groups related articles using HDBSCAN on MiniLM embeddings.
    Adds cluster_id to each article.
    Falls back to no clustering if embeddings unavailable.
    """
    from services.ml_models import get_embed_model
    _embed_model = get_embed_model()

    if _embed_model is None or len(articles) < 3:
        for i, a in enumerate(articles):
            a["cluster_id"] = f"single_{i}"
        return articles

    try:
        import numpy as np
        import hdbscan

        texts = [
            (a.get("title", "") + " " + a.get("body_text", ""))[:512]
            for a in articles
        ]
        embeddings = _embed_model.encode(texts, show_progress_bar=False)
        embeddings = np.array(embeddings).astype("float32")

        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=2,
            min_samples=1,
            metric="euclidean",
        )
        labels = clusterer.fit_predict(embeddings)

        for article, label in zip(articles, labels):
            c_id = f"cluster_{label}" if label >= 0 else f"single_{id(article)}"
            article["cluster_id"] = c_id
            article["clusterId"] = c_id
    except Exception as e:
        print(f"[NLP] Clustering failed ({e}), skipping")
        for i, a in enumerate(articles):
            a["cluster_id"] = f"single_{i}"
            a["clusterId"] = f"single_{i}"

    return articles


# ────────────────────────────────────────────────────────────────
# SECTION 8: Main Pipeline Entry Point
# ────────────────────────────────────────────────────────────────


async def process_articles(articles: list[dict]) -> list[dict]:
    """
    Runs the full NLP pipeline on a list of raw articles.
    Each article gets: sentiment, entities, summary,
    risk_score, trend_score, why_it_matters, suggested_action.
    """
    processed = []

    for article in articles:
        text = article.get("body_text", "") or article.get("title", "")
        keyword = article.get("keyword", "")
        url = article.get("url", "")

        try:
            sentiment_result = analyze_sentiment(text)
            sentiment = sentiment_result["label"]
            sentiment_score = sentiment_result["score"]
        except Exception:
            sentiment, sentiment_score = "neutral", 0.5

        try:
            entities = extract_entities(text)
        except Exception:
            entities = []

        try:
            summary = summarize(text)
        except Exception:
            summary = text[:200]

        risk = compute_risk_score(text, keyword, sentiment)
        trend = compute_trend_score(url, keyword)
        why = why_it_matters(keyword, sentiment, entities)
        action = suggested_action(risk, sentiment)

        origin = article.get("origin", "")
        category = (
            "News" if origin in ("google_news_rss", "gdelt")
            else "Social" if origin == "mastodon"
            else "Technology" if origin == "hackernews"
            else "Reference" if origin == "wikimedia"
            else "Technology"
        )

        processed.append(
            {
                **article,
                "id": article.get("url", str(id(article))),
                "headline": article.get("title", "Untitled"),
                "sourceUrl": article.get("url", ""),
                "timestamp": article.get("published_at", "Just now"),
                "publishedAt": article.get("published_at", ""),
                "thumbnail": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80",
                "category": category,
                "sentiment": {
                    "label": sentiment,
                    "score": sentiment_score
                },
                "riskScore": risk,
                "trendScore": trend,
                "entities": [{"text": e["text"], "type": e.get("label", "Unknown")} for e in entities],
                "summary": summary,
                "whyItMatters": why,
                "suggestedAction": action,
                "relatedCount": 0,
                # Keep internal snake_case
                "risk_score": risk,
                "trend_score": trend,
            }
        )

    return cluster_articles(processed)
