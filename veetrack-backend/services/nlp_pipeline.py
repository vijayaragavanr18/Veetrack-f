"""
NLP pipeline — rule-based sentiment analysis, entity extraction, and risk scoring.

No external NLP libraries required. Everything is regex / keyword based.
"""

from __future__ import annotations

import logging
import re
from collections import Counter
from typing import Optional

from models.schemas import (
    ArticleCard,
    Entity,
    EntityType,
    RawArticle,
    RiskLevel,
    Sentiment,
    SentimentLabel,
    WikidataFact,
    WikidataFacts,
)

logger = logging.getLogger(__name__)

# ── Sentiment lexicons ───────────────────────────────────────

_POSITIVE_WORDS = frozenset({
    "good", "great", "excellent", "amazing", "wonderful", "fantastic",
    "outstanding", "positive", "success", "successful", "innovative",
    "breakthrough", "growth", "profit", "gain", "improve", "improved",
    "benefit", "advantage", "opportunity", "promising", "optimistic",
    "recovery", "rebound", "surge", "thrive", "prosper", "achieve",
    "milestone", "launch", "celebrate", "win", "award", "best",
    "strong", "boost", "advance", "progress", "uplift", "bright",
    "hope", "hopeful", "confident", "resilient", "efficient",
})

_NEGATIVE_WORDS = frozenset({
    "bad", "terrible", "awful", "horrible", "negative", "failure",
    "crisis", "crash", "decline", "loss", "risk", "threat", "danger",
    "harmful", "damage", "destroy", "attack", "breach", "hack",
    "fraud", "scandal", "corrupt", "collapse", "recession", "debt",
    "deficit", "layoff", "fire", "cut", "shutdown", "ban", "illegal",
    "violation", "warning", "alert", "emergency", "disaster",
    "conflict", "war", "violence", "protest", "strike", "outage",
    "controversy", "lawsuit", "penalty", "fine", "sanction",
    "investigate", "investigation", "suspended", "downturn",
})

_INTENSIFIERS = frozenset({
    "very", "extremely", "incredibly", "remarkably", "highly",
    "deeply", "absolutely", "utterly", "completely", "severely",
})

_RISK_KEYWORDS = frozenset({
    "crisis", "emergency", "attack", "breach", "hack", "threat",
    "danger", "risk", "warning", "alert", "critical", "severe",
    "outage", "shutdown", "collapse", "crash", "disaster", "war",
    "conflict", "violence", "terror", "pandemic", "epidemic",
    "sanction", "ban", "recall", "contamination", "exploit",
    "vulnerability", "malware", "ransomware", "phishing",
})


# ── Entity patterns ──────────────────────────────────────────

_ORG_SUFFIXES = r"(?:Inc|Corp|Ltd|LLC|Co|Group|Holdings|International|Technologies|Systems|Software|Pharma|Bank|University|Institute|Foundation|Organization|Agency|Authority)"

_ENTITY_PATTERNS: list[tuple[EntityType, re.Pattern]] = [
    # Organizations
    (
        EntityType.ORGANIZATION,
        re.compile(
            rf"\b([A-Z][a-zA-Z0-9&\-]+ (?:{ _ORG_SUFFIXES }))\b"
        ),
    ),
    # Locations — simple heuristic: word starting with uppercase followed by known place words
    (
        EntityType.LOCATION,
        re.compile(
            r"\b([A-Z][a-zA-Z\s]+(?:City|State|Country|Republic|Kingdom|Island|Province|Region|County|District|Town))\b"
        ),
    ),
    # Person — "Title Surname" heuristic
    (
        EntityType.PERSON,
        re.compile(
            r"\b((?:Mr|Mrs|Ms|Dr|Prof|President|CEO|CTO|CFO|Senator|Governor|Minister|General|Admiral)\.\s+[A-Z][a-zA-Z\-]+)"
        ),
    ),
    # Products — quoted names or CamelCase with product suffixes
    (
        EntityType.PRODUCT,
        re.compile(
            r"\b([A-Z][a-zA-Z0-9]*(?:Pro|Max|Plus|Ultra|Lite|Air|Studio|Cloud|AI|GPT|LLM))\b"
        ),
    ),
    # Events
    (
        EntityType.EVENT,
        re.compile(
            r"\b((?:World|International|Global|National)[A-Z][a-zA-Z]*(?:Conference|Summit|Championship|Olympics|Forum|Expo))\b"
        ),
    ),
]


# ── Sentiment analysis ───────────────────────────────────────


def analyze_sentiment(text: str) -> Sentiment:
    """Rule-based sentiment analysis returning a Sentiment object."""
    if not text:
        return Sentiment(label=SentimentLabel.NEUTRAL, score=0.0, confidence=0.5)

    words = re.findall(r"\b[a-z]+\b", text.lower())
    if not words:
        return Sentiment(label=SentimentLabel.NEUTRAL, score=0.0, confidence=0.5)

    pos_count = sum(1 for w in words if w in _POSITIVE_WORDS)
    neg_count = sum(1 for w in words if w in _NEGATIVE_WORDS)

    # Intensifier boost
    for w in words:
        if w in _INTENSIFIERS:
            # Check the word after the intensifier in the original text
            pass  # simplified — just add a small boost
            pos_count += 0.3
            neg_count += 0.3

    total = pos_count + neg_count
    if total == 0:
        return Sentiment(label=SentimentLabel.NEUTRAL, score=0.0, confidence=0.3)

    raw_score = (pos_count - neg_count) / total
    confidence = min(total / len(words) * 3, 1.0)

    if raw_score > 0.15:
        label = SentimentLabel.POSITIVE
    elif raw_score < -0.15:
        label = SentimentLabel.NEGATIVE
    else:
        label = SentimentLabel.NEUTRAL

    return Sentiment(label=label, score=round(raw_score, 3), confidence=round(confidence, 3))


# ── Entity extraction ────────────────────────────────────────


def extract_entities(text: str, max_entities: int = 10) -> list[Entity]:
    """Extract named entities using regex patterns."""
    if not text:
        return []

    seen: set[str] = set()
    entities: list[Entity] = []

    for entity_type, pattern in _ENTITY_PATTERNS:
        for match in pattern.finditer(text):
            value = match.group(1).strip()
            if value.lower() not in seen and len(value) > 2:
                seen.add(value.lower())
                entities.append(
                    Entity(
                        text=value,
                        entity_type=entity_type,
                        confidence=0.6,
                    )
                )
            if len(entities) >= max_entities:
                return entities

    # Fallback: extract capitalized multi-word phrases
    cap_pattern = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b")
    for match in cap_pattern.finditer(text):
        value = match.group(1).strip()
        # Skip common non-entity phrases
        skip = {"The", "This", "That", "These", "Those", "New", "Last", "Next"}
        if any(value.startswith(s + " ") for s in skip):
            continue
        if value.lower() not in seen and len(value) > 4:
            seen.add(value.lower())
            entities.append(
                Entity(
                    text=value,
                    entity_type=EntityType.OTHER,
                    confidence=0.4,
                )
            )
        if len(entities) >= max_entities:
            break

    return entities


# ── Keyword extraction ───────────────────────────────────────

_STOP_WORDS = frozenset({
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "each",
    "every", "both", "few", "more", "most", "other", "some", "such", "no",
    "nor", "not", "only", "own", "same", "so", "than", "too", "very",
    "just", "because", "but", "and", "or", "if", "while", "about", "up",
    "its", "it", "he", "she", "they", "them", "their", "his", "her",
    "we", "us", "our", "you", "your", "i", "me", "my", "this", "that",
    "these", "those", "which", "who", "whom", "what", "whose", "also",
    "said", "says", "say", "new", "one", "two", "first", "last", "long",
})


def extract_keywords(text: str, max_keywords: int = 8) -> list[str]:
    """Extract top keywords from text using simple frequency analysis."""
    if not text:
        return []

    words = re.findall(r"\b[a-z]{3,}\b", text.lower())
    filtered = [w for w in words if w not in _STOP_WORDS]
    counter = Counter(filtered)
    return [w for w, _ in counter.most_common(max_keywords)]


# ── Risk scoring ─────────────────────────────────────────────


def compute_risk_score(text: str, sentiment: Optional[Sentiment] = None) -> tuple[float, RiskLevel]:
    """Compute a risk score (0-1) and risk level from text + sentiment."""
    if not text:
        return 0.0, RiskLevel.LOW

    words = set(re.findall(r"\b[a-z]+\b", text.lower()))
    risk_hits = len(words & _RISK_KEYWORDS)

    # Base risk from keyword density
    keyword_risk = min(risk_hits / 5.0, 1.0)

    # Sentiment contribution
    sentiment_risk = 0.0
    if sentiment:
        if sentiment.label == SentimentLabel.NEGATIVE:
            sentiment_risk = abs(sentiment.score) * 0.4
        elif sentiment.label == SentimentLabel.POSITIVE:
            sentiment_risk = 0.0

    # Combined score
    score = round(min(keyword_risk * 0.6 + sentiment_risk, 1.0), 3)

    if score >= 0.8:
        level = RiskLevel.CRITICAL
    elif score >= 0.5:
        level = RiskLevel.HIGH
    elif score >= 0.25:
        level = RiskLevel.MEDIUM
    else:
        level = RiskLevel.LOW

    return score, level


# ── Full pipeline ────────────────────────────────────────────


def enrich_article(article: RawArticle) -> ArticleCard:
    """Run the full NLP pipeline on a RawArticle → ArticleCard."""
    text = f"{article.title} {article.body}"

    sentiment = analyze_sentiment(text)
    entities = extract_entities(text)
    keywords = extract_keywords(text)
    risk_score, risk_level = compute_risk_score(text, sentiment)

    # Build WikidataFacts if available
    wikidata_facts: Optional[WikidataFacts] = None
    claims = article.extra.get("claims", [])
    if claims and article.source == SourceType.WIKIDATA:
        wikidata_facts = WikidataFacts(
            entity_id=article.extra.get("wikidata_id", ""),
            label=article.title,
            description=article.extra.get("description", ""),
            facts=[
                WikidataFact(
                    property_label=c.get("property_label", ""),
                    value_label=c.get("value_label", ""),
                    property_id=c.get("property_id"),
                    value_id=c.get("value_id"),
                )
                for c in claims[:20]
            ],
            aliases=article.extra.get("aliases", []),
            instance_of=[
                c["value_label"]
                for c in claims
                if c.get("property_id") == "P31"
            ],
        )
        # Link wikidata_id to matching entities
        for ent in entities:
            if ent.text.lower() == article.title.lower():
                ent.wikidata_id = article.extra.get("wikidata_id")

    # Extract reaction counts from source-specific extras
    reaction_count = 0
    share_count = 0
    comment_count = 0
    extra = article.extra

    if article.source == SourceType.HACKERNEWS:
        comment_count = extra.get("descendants", 0)
        reaction_count = extra.get("score", 0)
    elif article.source == SourceType.MASTODON:
        reaction_count = extra.get("favourites_count", 0)
        share_count = extra.get("reblogs_count", 0)
        comment_count = extra.get("replies_count", 0)

    return ArticleCard(
        id=article.extra.get("wikidata_id")
        or article.extra.get("hn_id")
        or article.extra.get("mastodon_id")
        or str(hash(article.url or article.title))[:12],
        source=article.source,
        title=article.title,
        body=article.body[:1000] if article.body else "",
        url=article.url,
        published_at=article.published_at,
        fetched_at=article.fetched_at,
        sentiment=sentiment,
        entities=entities,
        risk_score=risk_score,
        risk_level=risk_level,
        keywords=keywords,
        wikidata_facts=wikidata_facts,
        reaction_count=reaction_count,
        share_count=share_count,
        comment_count=comment_count,
    )
