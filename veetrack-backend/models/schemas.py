"""
Pydantic models for the VeeTrack intelligence platform.

Models represent the data flowing through the system:
- RawArticle: raw data from any source
- ArticleCard: processed article ready for display
- IntelligenceReport: full enriched report
- WikidataFacts: structured facts from Wikidata
- Sentiment: sentiment analysis result
- Entity: extracted named entity
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, HttpUrl


# ── Enums ────────────────────────────────────────────────────


class SourceType(str, Enum):
    GDELT = "gdelt"
    RSS = "rss"
    HACKERNEWS = "hackernews"
    MASTODON = "mastodon"
    WIKIPEDIA = "wikipedia"
    WIKIDATA = "wikidata"


class SentimentLabel(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EntityType(str, Enum):
    PERSON = "person"
    ORGANIZATION = "organization"
    LOCATION = "location"
    PRODUCT = "product"
    EVENT = "event"
    CONCEPT = "concept"
    OTHER = "other"


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


# ── Core data models ─────────────────────────────────────────


class Entity(BaseModel):
    """A named entity extracted from text."""

    text: str
    entity_type: EntityType = EntityType.OTHER
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    wikidata_id: Optional[str] = None
    description: Optional[str] = None


class Sentiment(BaseModel):
    """Sentiment analysis result."""

    label: SentimentLabel = SentimentLabel.NEUTRAL
    score: float = Field(default=0.0, ge=-1.0, le=1.0)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class WikidataFact(BaseModel):
    """A single fact / claim from Wikidata."""

    property_label: str
    value_label: str
    property_id: Optional[str] = None
    value_id: Optional[str] = None


class WikidataFacts(BaseModel):
    """Structured facts about a Wikidata entity."""

    entity_id: str
    label: str
    description: Optional[str] = None
    facts: list[WikidataFact] = Field(default_factory=list)
    aliases: list[str] = Field(default_factory=list)
    instance_of: list[str] = Field(default_factory=list)


class RawArticle(BaseModel):
    """Raw article / item from any source before processing."""

    source: SourceType
    title: str = ""
    body: str = ""
    url: Optional[str] = None
    published_at: Optional[datetime] = None
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    extra: dict[str, Any] = Field(default_factory=dict)


class ArticleCard(BaseModel):
    """Processed article card ready for display."""

    id: str = ""
    source: SourceType
    title: str
    body: str = ""
    url: Optional[str] = None
    published_at: Optional[datetime] = None
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    sentiment: Optional[Sentiment] = None
    entities: list[Entity] = Field(default_factory=list)
    risk_score: float = Field(default=0.0, ge=0.0, le=1.0)
    risk_level: RiskLevel = RiskLevel.LOW
    keywords: list[str] = Field(default_factory=list)
    wikidata_facts: Optional[WikidataFacts] = None
    reaction_count: int = 0
    share_count: int = 0
    comment_count: int = 0


class IntelligenceReport(BaseModel):
    """Fully enriched intelligence report combining all sources."""

    articles: list[ArticleCard] = Field(default_factory=list)
    entities: list[Entity] = Field(default_factory=list)
    wikidata_facts: list[WikidataFacts] = Field(default_factory=list)
    total_sources: int = 0
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    summary: Optional[str] = None


# ── API request / response models ────────────────────────────


class FeedRequest(BaseModel):
    """Request parameters for the /api/feed endpoint."""

    query: Optional[str] = None
    sources: Optional[list[SourceType]] = None
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class FeedResponse(BaseModel):
    """Response from the /api/feed endpoint."""

    articles: list[ArticleCard]
    total: int
    query: Optional[str] = None
    sources_queried: list[str]
    elapsed_ms: float = 0.0


class ReactionRequest(BaseModel):
    """Request parameters for the /api/reaction endpoint."""

    query: str
    limit: int = Field(default=20, ge=1, le=100)


class ReactionResponse(BaseModel):
    """Aggregated social reaction data."""

    query: str
    mastodon_posts: list[ArticleCard] = Field(default_factory=list)
    hackernews_stories: list[ArticleCard] = Field(default_factory=list)
    wikidata_entities: list[WikidataFacts] = Field(default_factory=list)
    total_reactions: int = 0
    elapsed_ms: float = 0.0


class TrendRequest(BaseModel):
    """Request parameters for the /api/trend endpoint."""

    query: Optional[str] = None
    hours: int = Field(default=24, ge=1, le=168)
    limit: int = Field(default=50, ge=1, le=200)


class TrendTopic(BaseModel):
    """A single trending topic."""

    keyword: str
    count: int
    sentiment_avg: float = 0.0
    risk_avg: float = 0.0
    sources: list[str] = Field(default_factory=list)
    sample_articles: list[ArticleCard] = Field(default_factory=list)


class TrendResponse(BaseModel):
    """Response from the /api/trend endpoint."""

    topics: list[TrendTopic]
    total_articles: int
    hours: int
    query: Optional[str] = None
    elapsed_ms: float = 0.0


class AlertPayload(BaseModel):
    """Real-time alert pushed via WebSocket."""

    severity: AlertSeverity = AlertSeverity.WARNING
    title: str
    message: str
    risk_score: float = 0.0
    source: Optional[str] = None
    article_url: Optional[str] = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "ok"
    version: str = "1.0.0"
    redis: str = "unknown"
