"""Redis client singleton for VeeTrack backend."""
from __future__ import annotations
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Async client (for FastAPI routes)
_async_client = None


async def get_redis():
    """Return shared async Redis client. Creates on first call."""
    global _async_client
    if _async_client is None:
        try:
            import redis.asyncio as aioredis
            _async_client = await aioredis.from_url(
                REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
        except Exception as e:
            print(f"[Redis] Async client init failed: {e}")
            _async_client = None
    return _async_client


def get_sync_redis():
    """Return a synchronous Redis client (for Celery tasks)."""
    try:
        import redis
        return redis.from_url(
            REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
    except Exception as e:
        print(f"[Redis] Sync client init failed: {e}")
        return None


async def redis_available() -> bool:
    """Check if Redis is reachable."""
    try:
        r = await get_redis()
        if r is None:
            return False
        await r.ping()
        return True
    except Exception:
        return False
