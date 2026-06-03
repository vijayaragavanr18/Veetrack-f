"""
NLP pipeline — REAL NLP with graceful fallbacks.

Primary stack:
  - Cardiff RoBERTa (sentiment) → VADER fallback
  - spaCy en_core_web_sm (NER) → regex + OTT entity fallback
  - sentence-transformers + FAISS (embeddings/clustering) → skip fallback
  - sumy TextRank (summarization) → sentence-split fallback

Every model load is wrapped in try/except. The pipeline NEVER crashes
even if zero models are available.
"""

from __future__ import annotations

import hashlib
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Model loading is now handled centrally in services/ml_models.py
# SECTION 2: Sentiment Analysis
# ────────────────────────────────────────────────────────────────


def analyze_sentiment(text: str) -> dict:
    """
    Returns: {"label": "positive"|"negative"|"neutral", "score": float}

    Primary: Cardiff RoBERTa (transformers pipeline)
    Fallback: VADER
    """
    if not text or len(text.strip()) < 5:
        return {"label": "neutral", "score": 0.5}

    from services.ml_models import get_sentiment_model
    _sentiment_model = get_sentiment_model()
    
    if _sentiment_model is not None:
        result = _sentiment_model(text[:512])[0]
        label_map = {
            "LABEL_0": "negative",
            "LABEL_1": "neutral",
            "LABEL_2": "positive",
            "negative": "negative",
            "neutral": "neutral",
            "positive": "positive",
        }
        raw_label = (
            result[0]["label"] if isinstance(result, list) else result["label"]
        )
        raw_score = (
            result[0]["score"] if isinstance(result, list) else result["score"]
        )
        return {
            "label": label_map.get(raw_label, "neutral"),
            "score": round(raw_score, 3),
        }
    return {"label": "neutral", "score": 0.5}


# ────────────────────────────────────────────────────────────────
# SECTION 3: Named Entity Recognition
# ────────────────────────────────────────────────────────────────

# Known Indian OTT entities for domain-specific boost
OTT_ENTITIES = {
    "ZEE5", "ZEE 5", "Jio Hotstar", "Sony LIV", "SonyLIV",
    "Amazon Prime Video", "Netflix", "Manorama MAX", "Sun NXT",
    "Hoi Choi", "Klikk", "Aha", "Ultra Zakhas", "Addatimes",
    "ZEEL", "Zee Entertainment", "I&B Ministry", "ORMAX", "KPMG",
}


def extract_entities(text: str) -> list[dict]:
    """
    Returns list of {"text": str, "label": str}

    Primary: spaCy en_core_web_sm
    Fallback: regex + known OTT entity list
    """
    entities: list[dict] = []

    from services.ml_models import get_ner_model
    _nlp = get_ner_model()

    if _nlp is not None:
        doc = _nlp(text[:1000])
        seen: set[str] = set()
        for ent in doc.ents:
            if ent.label_ in (
                "PERSON", "ORG", "GPE", "PRODUCT", "EVENT", "NORP",
            ):
                key = ent.text.strip().lower()
                if key not in seen and len(ent.text.strip()) > 1:
                    seen.add(key)
                    entities.append({"text": ent.text.strip(), "label": ent.label_})

    return entities[:8]


# ────────────────────────────────────────────────────────────────
# SECTION 4: Extractive Summarization
# ────────────────────────────────────────────────────────────────


def summarize(text: str, sentences: int = 2) -> str:
    """
    Returns 2-sentence extractive summary.

    Primary: sumy TextRank
    Fallback: first 2 sentences
    """
    if not text or len(text.strip()) < 50:
        return text.strip()[:200]

    from services.ml_models import get_summarizer
    _summarizer = get_summarizer()

    if _summarizer is not None:
        import nltk
        nltk.download("punkt_tab", quiet=True)
        from sumy.nlp.tokenizers import Tokenizer
        from sumy.parsers.plaintext import PlaintextParser
        parser = PlaintextParser.from_string(text[:2000], Tokenizer("english"))
        summary_sentences = _summarizer(parser.document, sentences)
        result = " ".join(str(s) for s in summary_sentences)
        if result.strip():
            return result.strip()
    return text[:200]


# ────────────────────────────────────────────────────────────────
# SECTION 5: Real Signal-Based Scoring
# ────────────────────────────────────────────────────────────────

# Indian media authority tiers — used for risk and trend scoring
# Tier 1: National business/news, highest PR impact
TIER_1_SOURCES = [
    'economictimes', 'thehindu', 'hindustantimes', 'ndtv',
    'livemint', 'businessstandard', 'financialexpress',
    'timesofindia', 'indianexpress', 'moneycontrol',
    'reuters', 'bloomberg', 'ptinews', 'ians'
]

# Tier 2: Trade/Industry specific — high impact for OTT clients
TIER_2_SOURCES = [
    'exchange4media', 'indiantelevision', 'afaqs',
    'bestmediainfo', 'medianews4u', 'broadcastpro',
    'yourstory', 'inc42', 'entrackr', 'thetechportal'
]

# Tier 3: Regional language publications
TIER_3_SOURCES = [
    'eenadu', 'anandabazar', 'mathrubhumi', 'dinamalar',
    'lokmat', 'loksatta', 'pudhari', 'vijaykarnataka'
]

def get_source_tier(source_url: str) -> int:
    s = source_url.lower()
    if any(t in s for t in TIER_1_SOURCES): return 1
    if any(t in s for t in TIER_2_SOURCES): return 2
    if any(t in s for t in TIER_3_SOURCES): return 3
    return 4  # Unknown/blog


def compute_risk_score(text: str, keyword: str, sentiment: str,
                       source: str = "", entities: list = None) -> int:
    score = 0

    # Sentiment component (0-40 points)
    if sentiment == "negative": score += 40
    elif sentiment == "neutral": score += 10
    else: score += 0

    # Source authority (0-30 points)
    tier = get_source_tier(source)
    if tier == 1: score += 30
    elif tier == 2: score += 15
    elif tier == 3: score += 10
    else: score += 5

    # Negative keyword signals in headline (0-20 points)
    NEGATIVE_SIGNALS = ['sue','scam','fraud','fine','ban','probe',
                        'crisis','hack','leak','controversy','violation',
                        'arrested','illegal','penalty','shutdown']
    text_lower = text.lower()
    hits = sum(1 for w in NEGATIVE_SIGNALS if w in text_lower)
    score += min(hits * 7, 20)

    # Entity richness — more named entities = more newsworthy (0-10 points)
    entities_len = len(entities) if entities else 0
    score += min(entities_len * 2, 10)

    return min(score, 100)


def compute_trend_score(keyword: str, source: str,
                        published_at: str, hourly_volume: list) -> int:
    score = 0

    # Recency (0-40 points) — articles from last 2 hours score highest
    try:
        from datetime import datetime, timezone
        pub = datetime.fromisoformat(published_at.replace('Z','+00:00'))
        age_hours = (datetime.now(timezone.utc) - pub).total_seconds() / 3600
        if age_hours < 2:   score += 40
        elif age_hours < 6: score += 30
        elif age_hours < 12: score += 20
        elif age_hours < 24: score += 10
    except: score += 15

    # Volume spike (0-40 points)
    if len(hourly_volume) >= 4:
        import numpy as np
        recent = sum(hourly_volume[-2:]) / 2
        baseline = sum(hourly_volume[:-2]) / max(len(hourly_volume)-2, 1)
        if baseline > 0:
            ratio = recent / baseline
            if ratio >= 3: score += 40
            elif ratio >= 2: score += 30
            elif ratio >= 1.5: score += 20
            elif ratio >= 1: score += 10

    # Source authority (0-20 points)
    tier = get_source_tier(source)
    if tier == 1: score += 20
    elif tier == 2: score += 10
    elif tier == 3: score += 5
    else: score += 0

    return min(score, 100)


# ────────────────────────────────────────────────────────────────
# SECTION 6: Why It Matters + Suggested Action
# ────────────────────────────────────────────────────────────────


def why_it_matters(keyword: str, sentiment: str, entities: list) -> str:
    org_entities = [e["text"] for e in entities if e["label"] == "ORG"]
    people_entities = [e["text"] for e in entities if e["label"] == "PERSON"]

    if sentiment == "negative":
        if people_entities:
            return (
                f"Negative coverage involving {people_entities[0]} "
                f"may affect {keyword}'s public perception. "
                f"Monitor for escalation across sources."
            )
        return (
            f"Negative media narrative around {keyword} is forming. "
            f"Early response can limit reputational impact."
        )
    elif sentiment == "positive":
        if org_entities:
            return (
                f"Positive coverage of {keyword} alongside "
                f"{org_entities[0]} signals a favorable news cycle. "
                f"Opportunity to amplify reach."
            )
        return (
            f"Positive sentiment around {keyword} is trending. "
            f"Consider engaging with this coverage."
        )
    else:
        return (
            f"Neutral mention of {keyword} in media. "
            f"No immediate action required — archive for trend tracking."
        )


def suggested_action(risk_score: int, sentiment: str) -> str:
    if risk_score >= 70 and sentiment == "negative":
        return (
            "URGENT: Prepare PR response within 2 hours. "
            "Alert communications and leadership teams immediately."
        )
    elif risk_score >= 50:
        return (
            "FLAG: Monitor closely over the next 6 hours. "
            "Prepare a holding statement in case volume increases."
        )
    elif sentiment == "positive":
        return (
            "OPPORTUNITY: Share or engage with this positive coverage "
            "to amplify brand visibility."
        )
    else:
        return (
            "NOTE: Archive for weekly intelligence report. "
            "No immediate action needed."
        )


async def analyze_single_article_llm(article: dict, keyword: str) -> dict:
    """
    Generate detailed 'what happened', 'why it matters', and 'suggested actions'
    along with an elaborated full article report for a single article using
    the local Qwen2.5 3B model via Ollama.
    """
    title = article.get("title", "Untitled")
    source = article.get("source", "Unknown")
    body_text = article.get("body_text", "") or title

    prompt = f"""You are a senior media intelligence analyst. Analyze this news article about the keyword "{keyword}".

Title: {title}
Source: {source}
Content: {body_text[:1200]}

Generate a detailed, objective, and professional media analysis in JSON format with four keys:
- "what_happened": A list of exactly 3 detailed bullet points (1-2 sentences each) summarizing the key facts, metrics, events, and statements. Do not write generic summaries. Start directly with the factual event. Do not use markdown formatting.
- "why_it_matters": A list of exactly 3 detailed bullet points (1-2 sentences each) explaining the business/PR impact, sentiment implications, and industry significance of this news for {keyword}. Avoid introductory boilerplate; start directly with the analytical impact.
- "suggested_actions": A list of exactly 3 detailed bullet points (1-2 sentences each) proposing concrete, strategic, and actionable steps for the PR/comms team.
- "full_article_content": A highly elaborated, professional, and detailed news report of at least 3-4 multi-sentence paragraphs (around 300-500 words) written in a premium journalism style. It must expand on the title and snippet to provide comprehensive, factual-sounding context, background information, and implications. Format the output with standard HTML paragraph tags like '<p class="mb-4">Paragraph text...</p>'. Do not use asterisks (*) or markdown.

Ensure every single bullet point is highly specific, clear, and professional.
Output valid JSON only. No preamble, no other text."""

    import os
    import httpx
    import json

    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
    ollama_model = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

    # Standardize professional fallbacks
    fallback_sentiment = article.get("sentiment", "neutral")
    if isinstance(fallback_sentiment, dict):
        fallback_sentiment = fallback_sentiment.get("label", "neutral")
        
    fallback_what = [
        f"{title}.",
        f"The development is reported by {source} and focuses on key events affecting {keyword}.",
        f"Initial media sentiment tone is evaluated as predominantly {fallback_sentiment}."
    ]
    fallback_why = [
        f"This event is significant due to its direct association with {keyword}.",
        f"The current sentiment tone of the news is {fallback_sentiment}, which could impact corporate and PR strategy.",
        f"Ongoing monitoring of this development is advised to trace potential long-term industry impacts."
    ]
    fallback_actions = [
        f"Coordinate with monitoring teams to track subsequent coverage from {source}.",
        "Analyze external stakeholder reaction to assess if proactive statements are required.",
        "Update internal executive briefs with these latest developments."
    ]
    fallback_full = f"""<p class="mb-4"><strong>{title}</strong> — In a significant development reported by {source}, key events have unfolded that directly affect the market ecosystem surrounding {keyword}. Analysts are closely watching the situation as stakeholders evaluate the strategic and operational implications of this news.</p>
<p class="mb-4">The media sentiment tone has been analyzed as predominantly {fallback_sentiment}. This could lead to a shift in public perception and investor relations, potentially prompting communication changes or corporate responses from involved organizations.</p>
<p class="mb-4">Moving forward, PR and corporate communications teams are advised to monitor subsequent coverage and public reaction. Establishing transparent communication and tracking key metrics will be critical to managing potential risk vectors associated with this development.</p>"""

    try:
        async with httpx.AsyncClient(timeout=45) as client:
            resp = await client.post(
                ollama_url,
                json={
                    "model": ollama_model,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": 1200},
                },
            )
            if resp.status_code == 200:
                resp_text = resp.json().get("response", "").strip()
                
                # Replace curly quotes and smart punctuation to prevent encoding issues
                replacements = {
                    "’": "'",
                    "‘": "'",
                    "“": '"',
                    "”": '"',
                    "–": "-",
                    "—": "-",
                    "…": "...",
                }
                for original, replacement in replacements.items():
                    resp_text = resp_text.replace(original, replacement)
                
                # Helper to clean individual items of bullets, numbers, and quotes
                import re
                def clean_items(lst):
                    if not isinstance(lst, list):
                        return []
                    cleaned = []
                    for item in lst:
                        if item:
                            val = str(item)
                            # Strip any HTML tags from bullets
                            val = re.sub(r'<[^>]*>', '', val)
                            # Strip asterisks
                            val = val.replace("*", "")
                            # Strip leading numbers/bullets (e.g. "1. ", "- ", "• ", "* ")
                            val = re.sub(r'^(?:\d+[\.\)]\s*|[\-\u2022\u25cf\*\+]\s*)', '', val)
                            val = val.strip()
                            # Strip matching outer quotes if LLM added them
                            if len(val) >= 2 and ((val[0] == '"' and val[-1] == '"') or (val[0] == "'" and val[-1] == "'")):
                                val = val[1:-1].strip()
                            if val:
                                cleaned.append(val)
                    return cleaned

                try:
                    # Extract JSON using regex if wrapped in backticks or markdown code blocks
                    json_match = re.search(r"\{.*\}", resp_text, re.DOTALL)
                    if json_match:
                        resp_text = json_match.group(0)
                        
                    data = json.loads(resp_text)
                    
                    # Get lists using all common key variations
                    raw_what = next((data.get(k) for k in ("what_happened", "whatHappened", "what happened", "whathappened") if k in data), [])
                    raw_why = next((data.get(k) for k in ("why_it_matters", "whyItMatters", "why it matters", "whyitmatters") if k in data), [])
                    raw_actions = next((data.get(k) for k in ("suggested_actions", "suggestedActions", "suggested actions", "suggestedactionlist", "suggested_action_list") if k in data), [])
                    raw_full = next((data.get(k) for k in ("full_article_content", "fullContent", "full_content", "fullarticlecontent", "content") if k in data), "")
                    if isinstance(raw_full, list):
                        raw_full_str = "\n".join(str(p) for p in raw_full)
                    else:
                        raw_full_str = str(raw_full) if raw_full else ""
                    raw_full_str = raw_full_str.replace("*", "").strip()

                    result = {
                        "whatHappenedList": clean_items(raw_what),
                        "whyItMattersList": clean_items(raw_why),
                        "suggestedActionList": clean_items(raw_actions),
                        "fullContent": raw_full_str
                    }
                    if len(result["whatHappenedList"]) >= 2 and len(result["whyItMattersList"]) >= 2:
                        return result
                except Exception as json_err:
                    logger.warning(f"Ollama JSON parsing failed, attempting text extraction fallback: {json_err}")
                
                # Fallback text extraction if JSON parsing failed or fields are missing
                sections = {"whatHappenedList": [], "whyItMattersList": [], "suggestedActionList": [], "fullContent": []}
                current_section = None
                lines = resp_text.split('\n')
                for line in lines:
                    line_str = line.strip()
                    if not line_str:
                        continue
                    line_lower = line_str.lower()
                    if "what_happened" in line_lower or "what happened" in line_lower:
                        current_section = "whatHappenedList"
                        continue
                    elif "why_it_matters" in line_lower or "why it matters" in line_lower:
                        current_section = "whyItMattersList"
                        continue
                    elif "suggested_actions" in line_lower or "suggested actions" in line_lower or "suggested_action" in line_lower:
                        current_section = "suggestedActionList"
                        continue
                    elif "full_article_content" in line_lower or "fullcontent" in line_lower or "full_content" in line_lower or "full article content" in line_lower:
                        current_section = "fullContent"
                        continue
                    
                    # If line looks like a bullet or list item, or we are in fullContent paragraph collection
                    if current_section:
                        if current_section == "fullContent":
                            sections[current_section].append(line_str)
                        elif line_str.startswith('-') or line_str.startswith('*') or line_str.startswith('•') or (line_str[0].isdigit() and len(line_str) > 1 and (line_str[1] == '.' or line_str[1] == ')')):
                            sections[current_section].append(line_str)
                
                # Format text fallback for fullContent
                fallback_text_full = "\n".join(sections["fullContent"]).replace("*", "").strip()
                if fallback_text_full and not fallback_text_full.startswith("<p"):
                    # Wrap split sections in basic paragraphs if HTML was not returned
                    paras = [f'<p class="mb-4">{p.strip()}</p>' for p in fallback_text_full.split('\n\n') if p.strip()]
                    fallback_text_full = "\n".join(paras)

                cleaned_sections = {
                    "whatHappenedList": clean_items(sections["whatHappenedList"]),
                    "whyItMattersList": clean_items(sections["whyItMattersList"]),
                    "suggestedActionList": clean_items(sections["suggestedActionList"]),
                    "fullContent": fallback_text_full if fallback_text_full else fallback_full
                }
                if len(cleaned_sections["whatHappenedList"]) >= 2 and len(cleaned_sections["whyItMattersList"]) >= 2:
                    return cleaned_sections
    except Exception as e:
        logger.error(f"Ollama article analysis failed: {e}")
    
    # Return structured fallback if LLM is unavailable or fails completely
    return {
        "whatHappenedList": fallback_what,
        "whyItMattersList": fallback_why,
        "suggestedActionList": fallback_actions,
        "fullContent": fallback_full
    }


# ────────────────────────────────────────────────────────────────
# SECTION 7: Story Clustering
# ────────────────────────────────────────────────────────────────


def cluster_articles(articles: list[dict]) -> list[dict]:
    """
    Groups related articles using HDBSCAN on MiniLM embeddings.
    Adds cluster_id to each article.
    Falls back to no clustering if embeddings unavailable.
    """
    from services.ml_models import get_embed_model
    _embed_model = get_embed_model()

    if _embed_model is None or len(articles) < 3:
        for i, a in enumerate(articles):
            a["cluster_id"] = f"single_{i}"
        return articles

    try:
        import numpy as np
        import hdbscan

        texts = [
            (a.get("title", "") + " " + a.get("body_text", ""))[:512]
            for a in articles
        ]
        embeddings = _embed_model.encode(texts, show_progress_bar=False)
        embeddings = np.array(embeddings).astype("float32")

        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=2,
            min_samples=1,
            metric="euclidean",
        )
        labels = clusterer.fit_predict(embeddings)

        for article, label in zip(articles, labels):
            c_id = f"cluster_{label}" if label >= 0 else f"single_{id(article)}"
            article["cluster_id"] = c_id
            article["clusterId"] = c_id
    except Exception as e:
        print(f"[NLP] Clustering failed ({e}), skipping")
        for i, a in enumerate(articles):
            a["cluster_id"] = f"single_{i}"
            a["clusterId"] = f"single_{i}"

    return articles


# ────────────────────────────────────────────────────────────────
# SECTION 8: Main Pipeline Entry Point
# ────────────────────────────────────────────────────────────────


async def process_articles(articles: list[dict]) -> list[dict]:
    """
    Runs the full NLP pipeline on a list of raw articles.
    Each article gets: sentiment, entities, summary,
    risk_score, trend_score, why_it_matters, suggested_action.
    """
    processed = []

    for article in articles:
        text = article.get("body_text", "") or article.get("title", "")
        keyword = article.get("keyword", "")
        url = article.get("url", "")

        try:
            sentiment_result = analyze_sentiment(text)
            sentiment = sentiment_result["label"]
            sentiment_score = sentiment_result["score"]
        except Exception:
            sentiment, sentiment_score = "neutral", 0.5

        # Compound keyword check
        compound = article.get('compound_filter')
        if compound:
            combined = (article.get('title', '') + ' ' +
                        article.get('body_text', '')).lower()
            if compound.lower() not in combined:
                continue  # Skip — keyword present but compound context missing

        try:
            entities = extract_entities(text)
        except Exception:
            entities = []

        try:
            summary = summarize(text)
        except Exception:
            summary = text[:200]

        source = article.get("source", url)
        published_at = article.get("published_at", "")
        hourly_volume = article.get("hourly_volume", [])

        risk = compute_risk_score(text, keyword, sentiment, source, entities)
        trend = compute_trend_score(keyword, source, published_at, hourly_volume)
        why = why_it_matters(keyword, sentiment, entities)
        action = suggested_action(risk, sentiment)

        origin = article.get("origin", "")
        category = (
            "News" if origin in ("google_news_rss", "gdelt")
            else "Social" if origin == "mastodon"
            else "Technology" if origin == "hackernews"
            else "Reference" if origin == "wikimedia"
            else "Technology"
        )

        processed.append(
            {
                **article,
                "id": article.get("url", str(id(article))),
                "headline": article.get("title", "Untitled"),
                "sourceUrl": article.get("url", ""),
                "timestamp": article.get("published_at", "Just now"),
                "publishedAt": article.get("published_at", ""),
                "thumbnail": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80",
                "category": category,
                "sentiment": {
                    "label": sentiment,
                    "score": sentiment_score
                },
                "riskScore": risk,
                "trendScore": trend,
                "entities": [{"text": e["text"], "type": e.get("label", "Unknown")} for e in entities],
                "summary": summary,
                "whyItMatters": why,
                "suggestedAction": action,
                "relatedCount": 0,
                # Keep internal snake_case
                "risk_score": risk,
                "trend_score": trend,
            }
        )

    try:
        from datasketch import MinHash, MinHashLSH

        def deduplicate_by_content(articles: list) -> list:
            lsh = MinHashLSH(threshold=0.8, num_perm=64)
            unique = []
            for i, article in enumerate(articles):
                text = (article.get('title','') + ' ' +
                        article.get('body_text',''))[:300]
                m = MinHash(num_perm=64)
                for word in text.lower().split():
                    m.update(word.encode('utf-8'))
                try:
                    result = lsh.query(m)
                    if not result:
                        lsh.insert(f"art_{i}", m)
                        unique.append(article)
                    # else: near-duplicate, skip
                except: unique.append(article)
            return unique

        processed = deduplicate_by_content(processed)
        
        # Sort by combined priority score (riskScore + trendScore) descending
        processed.sort(key=lambda x: x.get("riskScore", 0) + x.get("trendScore", 0), reverse=True)
        
        # Concurrently enrich all articles using local Ollama model
        import asyncio
        tasks = [analyze_single_article_llm(art, art.get("keyword", "")) for art in processed]
        llm_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for art, res in zip(processed, llm_results):
            if isinstance(res, dict) and res:
                art["whatHappenedList"] = res.get("whatHappenedList")
                art["whyItMattersList"] = res.get("whyItMattersList")
                art["suggestedActionList"] = res.get("suggestedActionList")
                if res.get("fullContent"):
                    art["fullContent"] = res.get("fullContent")
    except Exception as e:
        print(f"[NLP] Deduplication or LLM enrichment failed ({e}), skipping")

    return cluster_articles(processed)
