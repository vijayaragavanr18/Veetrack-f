"""
Reaction router — /api/reaction endpoint for social reactions.

Aggregates data from Mastodon, Hacker News, and Wikidata entity intelligence.
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
    ReactionResponse,
    WikidataFacts,
    WikidataFact,
    SourceType,
)
from services.ingestion import (
    fetch_hackernews,
    fetch_mastodon,
    fetch_wikidata,
)
from services.nlp_pipeline import enrich_article

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["reaction"])


@router.get("/reaction", response_model=ReactionResponse)
async def get_reaction(
    query: str = Query(..., description="Search query for reactions"),
    limit: int = Query(20, ge=1, le=100, description="Max results per source"),
):
    """
    Aggregate social reactions from Mastodon, Hacker News, and Wikidata.

    Returns:
    - Mastodon posts matching the query
    - Hacker News stories matching the query
    - Wikidata entity intelligence with structured facts
    """
    start = time.monotonic()
    settings = get_settings()

    # ── Parallel fetch from 3 sources ────────────────────────
    results = await asyncio.gather(
        _safe_fetch(fetch_mastodon(query, limit, settings), "mastodon"),
        _safe_fetch(fetch_hackernews(query, limit, settings), "hackernews"),
        _safe_fetch(fetch_wikidata(query, limit, settings), "wikidata"),
    )

    mastodon_raw, hn_raw, wikidata_raw = results

    # ── Enrich Mastodon posts ────────────────────────────────
    mastodon_cards: list[ArticleCard] = []
    for raw in mastodon_raw[:limit]:
        card = enrich_article(raw)
        mastodon_cards.append(card)

    # ── Enrich Hacker News stories ───────────────────────────
    hn_cards: list[ArticleCard] = []
    for raw in hn_raw[:limit]:
        card = enrich_article(raw)
        hn_cards.append(card)

    # ── Build Wikidata entity facts ──────────────────────────
    wikidata_entities: list[WikidataFacts] = []
    for raw in wikidata_raw[:limit]:
        card = enrich_article(raw)
        if card.wikidata_facts:
            wikidata_entities.append(card.wikidata_facts)
        else:
            # Build from raw extra data
            claims = raw.extra.get("claims", [])
            facts = [
                WikidataFact(
                    property_label=c.get("property_label", ""),
                    value_label=c.get("value_label", ""),
                    property_id=c.get("property_id"),
                    value_id=c.get("value_id"),
                )
                for c in claims[:15]
            ]
            instance_of = [
                c["value_label"]
                for c in claims
                if c.get("property_id") == "P31"
            ]
            wikidata_entities.append(
                WikidataFacts(
                    entity_id=raw.extra.get("wikidata_id", ""),
                    label=raw.title,
                    description=raw.extra.get("description", ""),
                    facts=facts,
                    aliases=raw.extra.get("aliases", []),
                    instance_of=instance_of,
                )
            )

    total = (
        sum(c.reaction_count + c.share_count + c.comment_count for c in mastodon_cards)
        + sum(c.reaction_count + c.comment_count for c in hn_cards)
    )

    elapsed_ms = (time.monotonic() - start) * 1000

    return ReactionResponse(
        query=query,
        mastodon_posts=mastodon_cards,
        hackernews_stories=hn_cards,
        wikidata_entities=wikidata_entities,
        total_reactions=total,
        elapsed_ms=round(elapsed_ms, 1),
    )


async def _safe_fetch(coro, name: str):
    """Wrapper to prevent a single source failure from breaking the whole request."""
    try:
        return await coro
    except Exception as exc:
        logger.error("Reaction fetch %s failed: %s", name, exc)
        return []
