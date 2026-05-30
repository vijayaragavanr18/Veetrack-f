"""
Ingestion service — async fetch functions for all 6 data sources.

Each function returns a list of RawArticle objects:
  - fetch_gdelt(query, limit)
  - fetch_rss(query, limit)
  - fetch_hackernews(query, limit)
  - fetch_mastodon(query, limit)
  - fetch_wikipedia(query, limit)
  - fetch_wikidata(query, limit)

All HTTP requests use httpx with a shared async client.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

import httpx

from core.config import Settings, get_settings
from models.schemas import RawArticle, SourceType

logger = logging.getLogger(__name__)

USER_AGENT = "VeeTrack/1.0 (media-intelligence-platform)"
_COMMON_HEADERS = {"User-Agent": USER_AGENT}


# ── helpers ──────────────────────────────────────────────────


def _make_client(timeout: float = 15.0) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=httpx.Timeout(timeout),
        headers=_COMMON_HEADERS,
        follow_redirects=True,
    )


def _slug(text: str) -> str:
    """Generate a short deterministic id from text."""
    return re.sub(r"[^a-z0-9]+", "-", text.lower())[:60].strip("-") or uuid4().hex[:12]


# ── GDELT ────────────────────────────────────────────────────


async def fetch_gdelt(
    query: Optional[str] = None,
    limit: int = 50,
    settings: Optional[Settings] = None,
) -> list[RawArticle]:
    """Fetch articles from the GDELT DOC API."""
    settings = settings or get_settings()
    search = query or "technology"
    # GDELT base URL may or may not include /doc/doc — normalise it
    base = settings.GDELT_API_URL.rstrip("/")
    endpoint = f"{base}/doc/doc" if not base.endswith("/doc/doc") else base
    params = {
        "query": search,
        "mode": "ArtList",
        "maxrecords": min(limit, 250),
        "format": "json",
        "sourcelang": "english",
    }
    articles: list[RawArticle] = []
    try:
        async with _make_client() as client:
            resp = await client.get(endpoint, params=params)
            resp.raise_for_status()
            data = resp.json()
        for item in data.get("articles", [])[:limit]:
            title = item.get("title", "").strip()
            if not title:
                continue
            articles.append(
                RawArticle(
                    source=SourceType.GDELT,
                    title=title,
                    body=item.get("snippet", ""),
                    url=item.get("url"),
                    published_at=_parse_date(item.get("seendate")),
                    extra={
                        "source_name": item.get("source", ""),
                        "language": item.get("language", ""),
                        "social_image": item.get("socialimage", ""),
                    },
                )
            )
    except Exception as exc:
        logger.error("GDELT fetch failed: %s", exc)
    return articles


# ── RSS ──────────────────────────────────────────────────────


async def fetch_rss(
    query: Optional[str] = None,
    limit: int = 50,
    settings: Optional[Settings] = None,
) -> list[RawArticle]:
    """Fetch articles from configured RSS feeds."""
    settings = settings or get_settings()
    feed_urls = [u.strip() for u in settings.RSS_FEEDS.split(",") if u.strip()]
    articles: list[RawArticle] = []
    try:
        # Lightweight RSS parser — no external dependency
        import xml.etree.ElementTree as ET

        async with _make_client(20.0) as client:
            for feed_url in feed_urls:
                try:
                    resp = await client.get(feed_url)
                    resp.raise_for_status()
                    root = ET.fromstring(resp.text)
                    # Handle RSS 2.0
                    ns = ""
                    # Detect namespace
                    m = re.match(r"\{(.+?)\}", root.tag)
                    if m:
                        ns = f"{{{m.group(1)}}}"
                    items = root.findall(f".//{ns}item")
                    for item in items[:limit]:
                        title_el = item.find(f"{ns}title")
                        desc_el = item.find(f"{ns}description")
                        link_el = item.find(f"{ns}link")
                        date_el = item.find(f"{ns}pubDate")
                        title = title_el.text.strip() if title_el is not None and title_el.text else ""
                        if not title:
                            continue
                        # Filter by query if provided
                        if query and query.lower() not in title.lower():
                            body_text = desc_el.text if desc_el is not None and desc_el.text else ""
                            if query.lower() not in body_text.lower():
                                continue
                        articles.append(
                            RawArticle(
                                source=SourceType.RSS,
                                title=title,
                                body=desc_el.text[:500] if desc_el is not None and desc_el.text else "",
                                url=link_el.text if link_el is not None and link_el.text else None,
                                published_at=_parse_date(date_el.text) if date_el is not None and date_el.text else None,
                                extra={"feed_url": feed_url},
                            )
                        )
                except Exception as exc:
                    logger.warning("RSS feed %s failed: %s", feed_url, exc)
    except Exception as exc:
        logger.error("RSS fetch failed: %s", exc)
    return articles[:limit]


# ── Hacker News ──────────────────────────────────────────────


async def fetch_hackernews(
    query: Optional[str] = None,
    limit: int = 50,
    settings: Optional[Settings] = None,
) -> list[RawArticle]:
    """Fetch stories from Hacker News via the Algolia API."""
    settings = settings or get_settings()
    base = settings.HN_API_URL
    articles: list[RawArticle] = []
    try:
        async with _make_client() as client:
            if query:
                # Search by query
                params = {
                    "query": query,
                    "tags": "story",
                    "hitsPerPage": min(limit, 50),
                }
                resp = await client.get(f"{base}/search", params=params)
            else:
                # Popular stories
                params = {
                    "tags": "story",
                    "hitsPerPage": min(limit, 50),
                }
                resp = await client.get(f"{base}/search", params=params)
            resp.raise_for_status()
            data = resp.json()

            for hit in data.get("hits", [])[:limit]:
                title = (hit.get("title") or "").strip()
                if not title:
                    continue
                story_url = hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}"
                articles.append(
                    RawArticle(
                        source=SourceType.HACKERNEWS,
                        title=title,
                        body=hit.get("story_text", "") or hit.get("comment_text", ""),
                        url=story_url,
                        published_at=_parse_date(hit.get("created_at")),
                        extra={
                            "hn_id": hit.get("objectID", ""),
                            "score": hit.get("points", 0) or 0,
                            "descendants": hit.get("num_comments", 0) or 0,
                            "by": hit.get("author", ""),
                        },
                    )
                )
    except Exception as exc:
        logger.error("HackerNews fetch failed: %s", exc)
    return articles


# ── Mastodon ─────────────────────────────────────────────────


async def fetch_mastodon(
    query: Optional[str] = None,
    limit: int = 50,
    settings: Optional[Settings] = None,
) -> list[RawArticle]:
    """Fetch public toots from Mastodon via search API.

    NOTE: The trending/statuses and timelines/public endpoints have been
    removed — they always return 404/422 on mastodon.social. Only the
    v2/search endpoint works reliably.
    """
    settings = settings or get_settings()
    base = settings.MASTODON_API_URL
    articles: list[RawArticle] = []
    try:
        async with _make_client() as client:
            # Search is the only reliably working Mastodon endpoint
            search_query = query or "technology"
            params = {
                "q": search_query,
                "type": "statuses",
                "limit": min(limit, 40),
            }
            resp = await client.get(f"{base}/v2/search", params=params)
            resp.raise_for_status()
            statuses = resp.json().get("statuses", [])

            for status in statuses[:limit]:
                content = _strip_html(status.get("content", ""))
                if not content and not status.get("spoiler_text"):
                    continue
                articles.append(
                    RawArticle(
                        source=SourceType.MASTODON,
                        title=status.get("spoiler_text", "") or content[:120],
                        body=content,
                        url=status.get("url"),
                        published_at=_parse_date(status.get("created_at")),
                        extra={
                            "mastodon_id": status.get("id"),
                            "account": status.get("account", {}).get("acct", ""),
                            "favourites_count": status.get("favourites_count", 0),
                            "reblogs_count": status.get("reblogs_count", 0),
                            "replies_count": status.get("replies_count", 0),
                        },
                    )
                )
    except Exception as exc:
        logger.error("Mastodon fetch failed: %s", exc)
    return articles


# ── Wikipedia ────────────────────────────────────────────────


async def fetch_wikipedia(
    query: Optional[str] = None,
    limit: int = 50,
    settings: Optional[Settings] = None,
) -> list[RawArticle]:
    """Search and fetch article summaries from Wikipedia."""
    settings = settings or get_settings()
    base = settings.WIKIPEDIA_API_URL
    articles: list[RawArticle] = []
    search_term = query or "current events"
    try:
        async with _make_client() as client:
            # Step 1: search for page titles
            params = {
                "action": "query",
                "list": "search",
                "srsearch": search_term,
                "srlimit": min(limit, 50),
                "format": "json",
            }
            resp = await client.get(base, params=params)
            resp.raise_for_status()
            search_results = resp.json().get("query", {}).get("search", [])

            # Step 2: get extracts for the top results
            titles = [r["title"] for r in search_results]
            if not titles:
                return articles

            extract_params = {
                "action": "query",
                "titles": "|".join(titles),
                "prop": "extracts|info",
                "exintro": 1,
                "explaintext": 1,
                "exsentences": 5,
                "inprop": "url",
                "format": "json",
            }
            resp2 = await client.get(base, params=extract_params)
            resp2.raise_for_status()
            pages = resp2.json().get("query", {}).get("pages", {})

            for page_id, page in pages.items():
                title = page.get("title", "").strip()
                if not title or page_id == "-1":
                    continue
                articles.append(
                    RawArticle(
                        source=SourceType.WIKIPEDIA,
                        title=title,
                        body=page.get("extract", "")[:800],
                        url=page.get("fullurl"),
                        published_at=datetime.now(timezone.utc),
                        extra={
                            "page_id": page_id,
                            "search_rank": next(
                                (i for i, r in enumerate(search_results) if r["title"] == title),
                                -1,
                            ),
                        },
                    )
                )
    except Exception as exc:
        logger.error("Wikipedia fetch failed: %s", exc)
    return articles


# ── Wikidata ─────────────────────────────────────────────────


async def fetch_wikidata(
    query: Optional[str] = None,
    limit: int = 20,
    settings: Optional[Settings] = None,
) -> list[RawArticle]:
    """Search Wikidata entities and return structured fact summaries."""
    settings = settings or get_settings()
    base = settings.WIKIDATA_API_URL
    articles: list[RawArticle] = []
    search_term = query or "technology"
    try:
        async with _make_client() as client:
            # Step 1: search for entities
            params = {
                "action": "wbsearchentities",
                "search": search_term,
                "language": "en",
                "limit": min(limit, 50),
                "format": "json",
            }
            resp = await client.get(base, params=params)
            resp.raise_for_status()
            entities = resp.json().get("search", [])

            for ent in entities[:limit]:
                entity_id = ent.get("id", "")
                label = ent.get("label", "").strip()
                if not label:
                    continue

                # Step 2: fetch entity claims for richer data
                claims = await _fetch_wikidata_claims(client, entity_id, settings)
                facts_summary = "; ".join(
                    f"{c['property_label']}: {c['value_label']}" for c in claims[:8]
                )

                articles.append(
                    RawArticle(
                        source=SourceType.WIKIDATA,
                        title=label,
                        body=ent.get("description", "") + (" | " + facts_summary if facts_summary else ""),
                        url=f"https://www.wikidata.org/wiki/{entity_id}",
                        published_at=datetime.now(timezone.utc),
                        extra={
                            "wikidata_id": entity_id,
                            "description": ent.get("description", ""),
                            "aliases": ent.get("aliases", []),
                            "claims": claims[:15],
                        },
                    )
                )
    except Exception as exc:
        logger.error("Wikidata fetch failed: %s", exc)
    return articles


async def _fetch_wikidata_claims(
    client: httpx.AsyncClient,
    entity_id: str,
    settings: Settings,
) -> list[dict]:
    """Fetch and simplify claims for a Wikidata entity."""
    try:
        params = {
            "action": "wbgetentities",
            "ids": entity_id,
            "props": "claims|labels",
            "format": "json",
        }
        resp = await client.get(settings.WIKIDATA_API_URL, params=params)
        resp.raise_for_status()
        entity_data = resp.json().get("entities", {}).get(entity_id, {})
        claims_raw = entity_data.get("claims", {})

        # Important property IDs for intelligence extraction
        PROPERTY_MAP = {
            "P31": "instance of",
            "P106": "occupation",
            "P108": "employer",
            "P127": "owned by",
            "P136": "genre",
            "P137": "operator",
            "P138": "named after",
            "P140": "religion",
            "P1412": "languages spoken",
            "P155": "follows",
            "P156": "followed by",
            "P159": "headquarters location",
            "P161": "cast member",
            "P166": "award received",
            "P169": "CEO",
            "P170": "creator",
            "P171": "parent taxon",
            "P176": "manufacturer",
            "P178": "developer",
            "P179": "part of the series",
            "P190": "sister city",
            "P206": "located in",
            "P227": "GND ID",
            "P26": "spouse",
            "P268": "BNF ID",
            "P35": "head of state",
            "P36": "capital",
            "P37": "official language",
            "P39": "position held",
            "P413": "position played",
            "P457": "identified by",
            "P463": "member of",
            "P488": "chairperson",
            "P495": "country of origin",
            "P527": "has part",
            "P530": "diplomatic relation",
            "P54": "member of sports team",
            "P551": "residence",
            "P569": "date of birth",
            "P57": "director",
            "P571": "inception",
            "P570": "date of death",
            "P580": "start time",
            "P585": "point in time",
            "P6": "head of government",
            "P641": "sport",
            "P740": "location of formation",
            "P937": "work location",
            "P112": "founded by",
            "P214": "VIAF ID",
            "P2427": "Crunchbase ID",
            "P452": "industry",
            "P1056": "product or material produced",
            "P158": "official website",
        }

        simplified: list[dict] = []
        for prop_id, claim_list in claims_raw.items():
            prop_label = PROPERTY_MAP.get(prop_id, prop_id)
            for claim in claim_list:
                mainsnak = claim.get("mainsnak", {})
                datavalue = mainsnak.get("datavalue", {})
                value = datavalue.get("value", {})

                if isinstance(value, dict) and "id" in value:
                    # Wikibase entity reference
                    value_id = value["id"]
                    # Try to get label from the same entity data or just use the ID
                    value_label = value_id
                    simplified.append(
                        {
                            "property_id": prop_id,
                            "property_label": prop_label,
                            "value_id": value_id,
                            "value_label": value_label,
                        }
                    )
                elif isinstance(value, dict) and "text" in value:
                    simplified.append(
                        {
                            "property_id": prop_id,
                            "property_label": prop_label,
                            "value_id": None,
                            "value_label": value["text"],
                        }
                    )
                elif isinstance(value, str):
                    simplified.append(
                        {
                            "property_id": prop_id,
                            "property_label": prop_label,
                            "value_id": None,
                            "value_label": value,
                        }
                    )
                elif isinstance(value, (int, float)):
                    simplified.append(
                        {
                            "property_id": prop_id,
                            "property_label": prop_label,
                            "value_id": None,
                            "value_label": str(value),
                        }
                    )
            if len(simplified) >= 20:
                break

        return simplified
    except Exception as exc:
        logger.warning("Wikidata claims fetch for %s failed: %s", entity_id, exc)
        return []


# ── Utility functions ────────────────────────────────────────


def _strip_html(html: str) -> str:
    """Crude HTML tag stripper — no external dependency."""
    return re.sub(r"<[^>]+>", "", html).strip()


def _parse_date(value: Any) -> Optional[datetime]:
    """Attempt to parse various date formats into a datetime."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        # Unix timestamp
        try:
            return datetime.fromtimestamp(value, tz=timezone.utc)
        except (OSError, OverflowError):
            return None
    if isinstance(value, str):
        formats = [
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S",
            "%Y%m%dT%H%M%SZ",
            "%Y%m%d%H%M%S",
            "%a, %d %b %Y %H:%M:%S %Z",
            "%a, %d %b %Y %H:%M:%S",
            "%Y-%m-%d",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(value.strip(), fmt)
            except ValueError:
                continue
    return None
