"""
VeeTrack configuration module.
Reads environment variables from ../.env using pydantic-settings.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path


def find_env_file() -> Path:
    """Locate the .env file one directory up from this project."""
    backend_dir = Path(__file__).resolve().parent.parent
    env_path = backend_dir.parent / ".env"
    if not env_path.exists():
        # Fallback: try the backend directory itself
        env_path = backend_dir / ".env"
    return env_path


_ENV_FILE = find_env_file()


class Settings(BaseSettings):
    """Application settings loaded from environment / .env file."""

    # ── General ──────────────────────────────────────────────
    APP_NAME: str = "VeeTrack"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=False)
    LOG_LEVEL: str = Field(default="INFO")

    # ── Backend server ───────────────────────────────────────
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)

    # ── Redis (optional) ─────────────────────────────────────
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # ── GDELT ────────────────────────────────────────────────
    GDELT_API_URL: str = Field(
        default="https://api.gdeltproject.org/api/v2"
    )

    # ── RSS feeds ────────────────────────────────────────────
    RSS_FEEDS: str = Field(
        default=(
            "https://feeds.reuters.com/reuters/topNews,"
            "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml,"
            "https://feeds.bbci.co.uk/news/rss.xml"
        )
    )

    # ── Hacker News (Algolia API) ────────────────────────────
    HN_API_URL: str = Field(
        default="https://hn.algolia.com/api/v1"
    )

    # ── Mastodon ─────────────────────────────────────────────
    MASTODON_BASE_URL: str = Field(default="https://mastodon.social")
    MASTODON_INSTANCE: str = Field(default="https://mastodon.social")
    MASTODON_API_URL: str = Field(default="https://mastodon.social/api/v1")

    # ── Wikipedia ────────────────────────────────────────────
    WIKIPEDIA_API_URL: str = Field(
        default="https://en.wikipedia.org/w/api.php"
    )

    # ── Wikidata ─────────────────────────────────────────────
    WIKIDATA_API_URL: str = Field(
        default="https://www.wikidata.org/w/api.php"
    )
    WIKIDATA_SPARQL_URL: str = Field(
        default="https://query.wikidata.org/sparql"
    )

    # ── Cache / rate-limit ───────────────────────────────────
    CACHE_TTL_SECONDS: int = Field(default=300)
    MAX_CONCURRENT_REQUESTS: int = Field(default=20)

    # ── Alert thresholds ─────────────────────────────────────
    ALERT_RISK_THRESHOLD: float = Field(default=0.7)
    ALERT_SENTIMENT_THRESHOLD: float = Field(default=-0.6)

    # ── Feed defaults ────────────────────────────────────────
    DEFAULT_FEED_LIMIT: int = Field(default=50)
    DEFAULT_TREND_HOURS: int = Field(default=24)

    model_config = {
        "env_file": str(_ENV_FILE),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
