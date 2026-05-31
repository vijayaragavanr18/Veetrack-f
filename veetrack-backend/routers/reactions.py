"""
Reactions router — /api/reactions endpoint.

Proxies requests to Mastodon, Hacker News for public reactions.
Runs server-side to avoid CORS issues and IP leakage.
"""

from __future__ import annotations

import asyncio
import logging
import re
from urllib.parse import quote_plus

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()


class ReactionsRequest(BaseModel):
    keyword: str


def _strip_html(text: str) -> str:
    """Remove HTML tags from text."""
    return re.sub(r"<[^>]+>", "", text).strip()


async def _fetch_mastodon(keyword: str) -> list[dict]:
    """Fetch Mastodon statuses for keyword (search endpoint ONLY)."""
    url = (
        f"https://mastodon.social/api/v2/search"
        f"?q={quote_plus(keyword)}&type=statuses&limit=5"
    )
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url)
        data = resp.json()
        results = []
        for s in data.get("statuses", []):
            content = _strip_html(s.get("content", ""))
            results.append(
                {
                    "id": s.get("id", ""),
                    "content": content,
                    "url": s.get("url", ""),
                    "created_at": s.get("created_at", ""),
                    "account": {
                        "display_name": (
                            s.get("account", {}).get("display_name", "")
                        ),
                        "username": s.get("account", {}).get("username", ""),
                    },
                }
            )
        return results
    except Exception as e:
        logger.warning("[Reactions/Mastodon] Error: %s", e)
        return []


async def _fetch_hackernews(keyword: str) -> list[dict]:
    """Fetch Hacker News stories for keyword."""
    url = (
        f"https://hn.algolia.com/api/v1/search"
        f"?query={quote_plus(keyword)}&tags=story&hitsPerPage=5"
    )
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url)
        data = resp.json()
        results = []
        for h in data.get("hits", []):
            results.append(
                {
                    "id": h.get("objectID", ""),
                    "title": h.get("title", ""),
                    "points": h.get("points", 0),
                    "numComments": h.get("num_comments", 0),
                    "url": h.get("url", ""),
                    "author": h.get("author", ""),
                }
            )
        return results
    except Exception as e:
        logger.warning("[Reactions/HN] Error: %s", e)
        return []


async def _fetch_wikidata(keyword: str) -> dict | None:
    """Fetch Wikidata entity for keyword."""
    search_url = (
        f"https://www.wikidata.org/w/api.php"
        f"?action=wbsearchentities&search={quote_plus(keyword)}"
        f"&language=en&limit=1&format=json"
    )
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            search_resp = await client.get(
                search_url,
                headers={"User-Agent": "VeeTrack/1.0 (media-intelligence)"},
            )
        search_data = search_resp.json()
        results = search_data.get("search", [])
        if not results:
            return None

        top = results[0]
        entity_id = top.get("id", "")

        # Get entity details for facts
        detail_url = (
            f"https://www.wikidata.org/w/api.php"
            f"?action=wbgetentities&ids={entity_id}"
            f"&props=labels|descriptions&languages=en&format=json"
        )
        detail_resp = await client.get(
            detail_url,
            headers={"User-Agent": "VeeTrack/1.0 (media-intelligence)"},
        )
        detail_data = detail_resp.json()
        entity = detail_data.get("entities", {}).get(entity_id, {})
        description = ""
        try:
            description = entity.get("descriptions", {}).get("en", {}).get("value", "")
        except Exception:
            pass

        return {
            "label": top.get("label", keyword),
            "description": description or top.get("description", ""),
            "entityId": entity_id,
            "facts": {},
            "url": f"https://www.wikidata.org/wiki/{entity_id}",
        }
    except Exception as e:
        logger.warning("[Reactions/Wikidata] Error: %s", e)
        return None


@router.post("/api/reactions")
async def get_reactions(req: ReactionsRequest):
    """Fetch public reactions from Mastodon, HN, and Wikidata."""
    kw = req.keyword

    results = await asyncio.gather(
        _fetch_mastodon(kw),
        _fetch_hackernews(kw),
        _fetch_wikidata(kw),
        return_exceptions=True,
    )

    return {
        "mastodon": results[0] if isinstance(results[0], list) else [],
        "hackernews": results[1] if isinstance(results[1], list) else [],
        "wikidata": results[2] if isinstance(results[2], dict) else None,
    }
