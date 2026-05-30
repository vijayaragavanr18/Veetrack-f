"""
WebSocket manager for real-time alert broadcasting.

Manages active WebSocket connections and provides a broadcast
method to push alert payloads to all connected clients.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections and message broadcasting."""

    def __init__(self) -> None:
        self._active: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    @property
    def active_count(self) -> int:
        """Return the number of active connections."""
        return len(self._active)

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self._active.add(websocket)
        logger.info(
            "WebSocket connected (total: %d)", len(self._active)
        )

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        async with self._lock:
            self._active.discard(websocket)
        logger.info(
            "WebSocket disconnected (total: %d)", len(self._active)
        )

    async def broadcast(self, message: str) -> None:
        """
        Broadcast a message to all connected WebSocket clients.

        Failed sends result in the connection being removed.
        """
        if not self._active:
            return

        stale: list[WebSocket] = []

        async with self._lock:
            for ws in list(self._active):
                try:
                    await ws.send_text(message)
                except Exception:
                    stale.append(ws)

        # Clean up stale connections
        if stale:
            async with self._lock:
                for ws in stale:
                    self._active.discard(ws)
            logger.warning(
                "Cleaned up %d stale WebSocket connections", len(stale)
            )

    async def send_personal(self, websocket: WebSocket, message: str) -> None:
        """Send a message to a single WebSocket client."""
        try:
            await websocket.send_text(message)
        except Exception:
            await self.disconnect(websocket)


# Module-level singleton
manager = ConnectionManager()
