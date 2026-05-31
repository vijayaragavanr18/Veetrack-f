"""
Article chat engine — FAISS + MiniLM for retrieval, Ollama/Qwen for generation.

Sessions are stored in-memory (replace with Redis later).
Each session indexes article chunks into a FAISS index for
semantic retrieval, then uses Ollama (qwen2.5:1.5b) for generation.
Falls back to keyword search + context extraction if models unavailable.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# In-memory session store (replace with Redis later)
_sessions: dict[str, dict] = {}


def _chunk_text(text: str, size: int = 256, overlap: int = 50) -> list[str]:
    """Split text into overlapping word-level chunks."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + size])
        chunks.append(chunk)
        i += size - overlap
    return chunks


async def start_session(
    session_id: str, article_text: str, article_title: str
) -> None:
    """
    Create a new chat session for an article.
    Chunks the article text and builds a FAISS index for retrieval.
    Falls back to keyword-only search if FAISS/MiniLM unavailable.
    """
    chunks = _chunk_text(article_text)
    index_data: dict = {"chunks": chunks, "title": article_title}

    try:
        from sentence_transformers import SentenceTransformer

        import faiss
        import numpy as np

        model = SentenceTransformer("all-MiniLM-L6-v2")
        embeddings = model.encode(chunks).astype("float32")
        index = faiss.IndexFlatL2(embeddings.shape[1])
        index.add(embeddings)
        index_data["index"] = index
        index_data["model"] = model
        index_data["embeddings"] = embeddings
        logger.info("[Chat] FAISS index built for session %s (%d chunks)", session_id, len(chunks))
    except Exception as e:
        logger.info("[Chat] FAISS unavailable for session %s (%s), using keyword fallback", session_id, e)
        pass  # Will fall back to keyword search

    _sessions[session_id] = index_data


async def ask_question(session_id: str, question: str) -> str:
    """
    Answer a question about an article using RAG (FAISS + Ollama).
    Falls back to keyword search + context extraction.
    """
    session = _sessions.get(session_id)
    if not session:
        return "Session not found or expired. Please reopen the article."

    chunks = session.get("chunks", [])
    title = session.get("title", "this article")

    # ── Retrieve relevant chunks ─────────────────────────────
    context_chunks: list[str] = []

    if "index" in session and "model" in session:
        try:
            import numpy as np

            q_embed = session["model"].encode([question]).astype("float32")
            _, indices = session["index"].search(q_embed, k=min(3, len(chunks)))
            context_chunks = [chunks[i] for i in indices[0] if i < len(chunks)]
        except Exception:
            context_chunks = chunks[:3]
    else:
        # Keyword fallback
        q_words = set(question.lower().split())
        scored = [(sum(1 for w in q_words if w in c.lower()), c) for c in chunks]
        scored.sort(reverse=True)
        context_chunks = [c for _, c in scored[:3]]

    context = "\n\n".join(context_chunks)

    # ── Generate answer via Ollama (local LLM) ──────────────
    prompt = f"""You are answering questions about a news article.
Article title: {title}

Relevant content from the article:
{context}

IMPORTANT RULES:
- Only answer based on the article content above
- If the answer is not in the article, say exactly:
  "This information is not in the article."
- Keep answers concise (2-3 sentences max)
- Do not use outside knowledge

Question: {question}
Answer:"""

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "qwen2.5:1.5b",
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": 200},
                },
            )
            if resp.status_code == 200:
                return resp.json().get("response", "").strip()
    except Exception:
        pass

    # ── Final fallback: extract answer from context directly ──
    if context_chunks:
        return f"Based on the article: {context_chunks[0][:300]}..."
    return "This information is not in the article."


async def end_session(session_id: str) -> None:
    """End a chat session and free memory."""
    _sessions.pop(session_id, None)
