"""
DiskCache client singleton for VeeTrack backend.
Replaces Redis to provide a 100% portable, self-contained architecture.
"""
from __future__ import annotations
import os
import fnmatch
from diskcache import Cache

CACHE_DIR = os.getenv("CACHE_DIR", ".veetrack_cache")
# Thread-safe, process-safe cache
_cache = Cache(CACHE_DIR)

class MockAsyncRedis:
    async def get(self, key: str) -> str | None:
        return _cache.get(key)
        
    async def set(self, key: str, value: str, ex: int | None = None):
        _cache.set(key, value, expire=ex)
        
    async def keys(self, pattern: str) -> list[str]:
        return [k for k in _cache.iterkeys() if fnmatch.fnmatch(k, pattern)]
        
    async def delete(self, *keys):
        for k in keys:
            _cache.delete(k)
            
    async def ping(self):
        return True
        
    async def aclose(self):
        # We don't close the global cache per request
        pass
        
    async def publish(self, channel: str, message: str):
        # Cross-process pub/sub not supported without Redis.
        # Fallback polling mechanisms will take over.
        pass
        
    def pubsub(self):
        raise RuntimeError("Pub/Sub not supported by DiskCache fallback")

class MockSyncRedis:
    def get(self, key: str) -> str | None:
        return _cache.get(key)
        
    def set(self, key: str, value: str, ex: int | None = None):
        _cache.set(key, value, expire=ex)
        
    def keys(self, pattern: str) -> list[str]:
        return [k for k in _cache.iterkeys() if fnmatch.fnmatch(k, pattern)]
        
    def delete(self, *keys):
        for k in keys:
            _cache.delete(k)

async def get_redis() -> MockAsyncRedis:
    """Return shared async cache client."""
    return MockAsyncRedis()

def get_sync_redis() -> MockSyncRedis:
    """Return a synchronous cache client (for Celery tasks)."""
    return MockSyncRedis()

async def redis_available() -> bool:
    """Check if cache is reachable."""
    return True
