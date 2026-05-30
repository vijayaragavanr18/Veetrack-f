"""
Redis client module with graceful fallback.
If Redis is unavailable the app continues using an in-memory dict cache.
"""

import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class InMemoryCache:
    """Minimal dict-based cache used when Redis is not available."""

    def __init__(self) -> None:
        self._store: dict[str, str] = {}

    async def get(self, key: str) -> Optional[str]:
        return self._store.get(key)

    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        self._store[key] = value

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def exists(self, key: str) -> bool:
        return key in self._store

    async def keys(self, pattern: str = "*") -> list[str]:
        if pattern == "*":
            return list(self._store.keys())
        import fnmatch
        return [k for k in self._store if fnmatch.fnmatch(k, pattern)]

    async def close(self) -> None:
        self._store.clear()


class RedisClient:
    """Async Redis wrapper with graceful in-memory fallback."""

    def __init__(self, url: str) -> None:
        self._url = url
        self._redis: Any = None
        self._cache: InMemoryCache = InMemoryCache()
        self._available: bool = False

    async def connect(self) -> None:
        """Try to connect to Redis; fall back to in-memory cache on failure."""
        try:
            import redis.asyncio as aioredis

            self._redis = aioredis.from_url(
                self._url, decode_responses=True, socket_connect_timeout=3
            )
            await self._redis.ping()
            self._available = True
            logger.info("Redis connected at %s", self._url)
        except Exception as exc:
            self._available = False
            self._redis = None
            logger.warning(
                "Redis unavailable (%s) — falling back to in-memory cache", exc
            )

    # ── public helpers ───────────────────────────────────────

    @property
    def available(self) -> bool:
        return self._available

    async def get(self, key: str) -> Optional[str]:
        if self._available and self._redis:
            return await self._redis.get(key)
        return await self._cache.get(key)

    async def get_json(self, key: str) -> Optional[Any]:
        raw = await self.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None

    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        if self._available and self._redis:
            await self._redis.set(key, value, ex=ex)
        else:
            await self._cache.set(key, value, ex=ex)

    async def set_json(self, key: str, value: Any, ex: int | None = None) -> None:
        await self.set(key, json.dumps(value, default=str), ex=ex)

    async def delete(self, key: str) -> None:
        if self._available and self._redis:
            await self._redis.delete(key)
        else:
            await self._cache.delete(key)

    async def exists(self, key: str) -> bool:
        if self._available and self._redis:
            return bool(await self._redis.exists(key))
        return await self._cache.exists(key)

    async def keys(self, pattern: str = "*") -> list[str]:
        if self._available and self._redis:
            return await self._redis.keys(pattern)
        return await self._cache.keys(pattern)

    async def close(self) -> None:
        if self._available and self._redis:
            await self._redis.close()
        await self._cache.close()


# ── module-level singleton ───────────────────────────────────
redis_client: Optional[RedisClient] = None


async def init_redis(url: str) -> RedisClient:
    """Initialise and return the global Redis client."""
    global redis_client
    redis_client = RedisClient(url)
    await redis_client.connect()
    return redis_client


def get_redis() -> Optional[RedisClient]:
    """Return the global Redis client (may be None before init)."""
    return redis_client
