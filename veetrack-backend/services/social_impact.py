import os
import asyncio
import logging
from urllib.parse import quote_plus
import httpx

from services.nlp_pipeline import analyze_sentiment

logger = logging.getLogger(__name__)

async def fetch_social_posts(platform: str, keyword: str, api_key: str, limit: int = 15) -> list[dict]:
    """Fetch real-time posts from API Direct for a platform (reddit, twitter)."""
    # API Direct base endpoints: /v1/reddit/posts, /v1/twitter/posts
    url = f"https://apidirect.io/v1/{platform}/posts?query={quote_plus(keyword)}&limit={limit}"
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get(url, headers={"X-API-Key": api_key})
        
        if resp.status_code != 200:
            logger.warning("[API Direct %s] HTTP Error %d: %s", platform, resp.status_code, resp.text)
            return []

        data = resp.json()
        raw_items = []
        if isinstance(data, list):
            raw_items = data
        elif isinstance(data, dict):
            raw_items = data.get("results") or data.get("posts") or data.get("data") or []
        
        posts = []
        for item in raw_items:
            content = item.get("snippet") or item.get("content") or item.get("title") or ""
            title = item.get("title") or item.get("snippet") or ""
            author = item.get("author") or "anonymous"
            url_link = item.get("url") or ""
            published_at = item.get("date") or item.get("published_at") or ""
            
            if content:
                posts.append({
                    "platform": platform,
                    "author": author,
                    "title": title,
                    "content": content,
                    "url": url_link,
                    "published_at": published_at,
                })
        return posts
    except Exception as e:
        logger.warning("[API Direct %s] Fetch exception for '%s': %s", platform, keyword, e)
        return []

async def generate_impact_summary(keyword: str, posts: list[dict]) -> str:
    """Generate a short executive social media impact summary using local Ollama model."""
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
    ollama_model = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

    if not posts:
        return f"No active social media discussions found on Twitter or Reddit regarding '{keyword}'."

    context_lines = []
    for p in posts[:12]:
        context_lines.append(f"- [{p['platform'].upper()}] @{p['author']}: {p['content'][:150]}")
    context = "\n".join(context_lines)

    prompt = f"""You are a professional social media intelligence analyst.
Analyze these recent social media posts about "{keyword}" to assess the public reception, influence, and viral impact.

RECENT POSTS:
{context}

Provide a concise, 2-3 paragraph Social Media Impact Summary. Highlight the core themes of discussion, public mood (e.g. positive excitement, skepticism, or controversy), and key engagement points. 
Keep the tone executive and analytical. Do not use markdown bullet points or formatting, just plain text paragraphs."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                ollama_url,
                json={
                    "model": ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": 300},
                },
            )
            if resp.status_code == 200:
                return resp.json().get("response", "").strip()
    except Exception as e:
        logger.debug("Ollama summary generation failed: %s", e)
    
    # Fallback summary
    pos_count = sum(1 for p in posts if p.get("sentiment") == "positive")
    neg_count = sum(1 for p in posts if p.get("sentiment") == "negative")
    return f"Active social discussion detected for '{keyword}' with {len(posts)} analyzed mentions. Sentiment leans towards { 'positive' if pos_count > neg_count else 'negative' if neg_count > pos_count else 'neutral' }."

async def fetch_twitterapi_posts(keyword: str, api_key: str, limit: int = 15) -> list[dict]:
    """Fetch real-time posts from TwitterAPI.io for a keyword."""
    url = "https://api.twitterapi.io/twitter/tweet/advanced_search"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                url,
                params={"query": keyword},
                headers={"X-API-Key": api_key}
            )
        
        if resp.status_code != 200:
            logger.warning("[TwitterAPI.io] HTTP Error %d: %s", resp.status_code, resp.text)
            return []

        data = resp.json()
        tweets = data.get("tweets") or []
        
        posts = []
        for tweet in tweets[:limit]:
            content = tweet.get("text") or ""
            author_obj = tweet.get("author") or {}
            author = author_obj.get("userName") or author_obj.get("name") or "anonymous"
            tweet_id = tweet.get("id") or ""
            url_link = f"https://x.com/{author}/status/{tweet_id}" if tweet_id and author else ""
            published_at = tweet.get("createdAt") or ""
            
            if content:
                posts.append({
                    "platform": "twitter",
                    "author": author,
                    "title": content[:100],
                    "content": content,
                    "url": url_link,
                    "published_at": published_at,
                })
        return posts
    except Exception as e:
        logger.warning("[TwitterAPI.io] Fetch exception for '%s': %s", keyword, e)
        return []

async def analyze_social_impact(keyword: str) -> dict:
    """Orchestrates the social media impact analysis pipeline."""
    apidirect_key = os.getenv("APIDIRECT_API_KEY")
    twitterapi_key = os.getenv("TWITTERAPI_IO_KEY")
    
    if not apidirect_key and not twitterapi_key:
        return {
            "error": "Neither APIDIRECT_API_KEY nor TWITTERAPI_IO_KEY is configured in the environment.",
            "success": False
        }

    async def get_empty():
        return []

    # Fetch from Twitter/X (preferring TwitterAPI.io if key is present)
    if twitterapi_key:
        twitter_task = fetch_twitterapi_posts(keyword, twitterapi_key)
    elif apidirect_key:
        twitter_task = fetch_social_posts("twitter", keyword, apidirect_key)
    else:
        twitter_task = get_empty()

    # Fetch from Reddit (using API Direct if key is present)
    if apidirect_key:
        reddit_task = fetch_social_posts("reddit", keyword, apidirect_key)
    else:
        reddit_task = get_empty()

    # Fetch from Twitter/X and Reddit in parallel
    results = await asyncio.gather(
        twitter_task,
        reddit_task,
        return_exceptions=True
    )

    all_posts = []
    for res in results:
        if isinstance(res, list):
            all_posts.extend(res)

    # Perform sentiment analysis on each post
    pos_count = 0
    neg_count = 0
    neu_count = 0

    for post in all_posts:
        sent = analyze_sentiment(post["content"])
        post["sentiment"] = sent["label"]
        post["sentiment_score"] = sent["score"]
        
        if sent["label"] == "positive":
            pos_count += 1
        elif sent["label"] == "negative":
            neg_count += 1
        else:
            neu_count += 1

    total_posts = len(all_posts)

    # Calculate Impact Score (0 to 100)
    # Neutral/base is 50. Positive posts boost it, negative posts drag it down.
    base_score = 50.0
    if total_posts > 0:
        sentiment_ratio = (pos_count - neg_count) / total_posts
        # Scale score dynamically
        impact_score = min(max(base_score + (sentiment_ratio * 40.0) + (total_posts * 0.5), 0), 100)
    else:
        impact_score = 0.0

    impact_score = round(impact_score, 1)

    # Determine Impact Tier
    if total_posts == 0:
        tier = "None"
    elif impact_score >= 75:
        tier = "Critical/Viral High"
    elif impact_score >= 60:
        tier = "High"
    elif impact_score >= 40:
        tier = "Medium"
    else:
        tier = "Low"

    # Generate LLM Conversation Summary
    summary = await generate_impact_summary(keyword, all_posts)

    return {
        "success": True,
        "keyword": keyword,
        "totalMentions": total_posts,
        "impactScore": impact_score,
        "impactTier": tier,
        "sentimentBreakdown": {
            "positive": pos_count,
            "negative": neg_count,
            "neutral": neu_count
        },
        "summary": summary,
        "posts": all_posts
    }
