import { createHash } from "crypto";

/* ═══════════════════════════════════════════════════════════
   VEETRACK — Shared Feed Utilities
   
   All constants, types, data fetchers, and computation
   functions shared between /api/feed and /api/intelligence.
   ═══════════════════════════════════════════════════════════ */

/* ─── Types ──────────────────────────────────────────────── */

export type CategoryType =
  | "Politics"
  | "Technology"
  | "Business"
  | "Sports"
  | "Entertainment"
  | "Health"
  | "Science"
  | "World"
  | "Social"
  | "Reference"
  | "General";

export interface ArticleCard {
  id: string;
  headline: string;
  source: string;
  sourceUrl: string;
  timestamp: string;
  publishedAt: string;
  thumbnail: string;
  category: CategoryType;
  url: string;
  sentiment: { label: string; score: number };
  riskScore: number;
  trendScore: number;
  entities: Array<{ text: string; type: string }>;
  summary: string;
  whyItMatters: string;
  suggestedAction: string;
  clusterId: string;
  relatedCount: number;
}

export interface RawArticle {
  headline: string;
  source: string;
  url: string;
  publishedAt: string;
  summary?: string;
  hnScore?: number;
  hnComments?: number;
  wikidataFacts?: Record<string, string>;
}

/* ─── Constants ──────────────────────────────────────────── */

export const POSITIVE_WORDS = [
  "win", "award", "growth", "launch", "success", "innovation",
  "partnership", "achievement", "breakthrough", "gain", "improve",
  "advance", "milestone", "record",
];

export const NEGATIVE_WORDS = [
  "crash", "breach", "loss", "decline", "crisis", "fail", "hack",
  "scandal", "bankrupt", "risk", "threat", "shortage", "crunch",
  "delay", "expose",
];

export const ORG_KEYWORDS = [
  "inc", "corp", "ltd", "technologies", "university", "institute",
  "foundation", "group", "company", "organization", "association", "council",
];

const LOC_KEYWORDS = [
  "city", "state", "country", "india", "australia", "america",
  "europe", "asia", "africa", "island", "republic",
];

export const RSS_FEEDS = [
  "https://feeds.feedburner.com/ndtvnews-latest",
  "https://www.thehindu.com/news/feeder/default.rss",
  "https://economictimes.indiatimes.com/rssfeedsdefault.cms",
];

export const MAX_ARTICLE_AGE_DAYS = 5;

/* ─── Category Detection ────────────────────────────────── */

const CATEGORY_KEYWORDS: Record<CategoryType, string[]> = {
  Politics: [
    "election", "parliament", "minister", "government", "politics", "congress",
    "bjp", "modi", "biden", "trump", "senate", "legislation", "policy", "vote",
    "democracy", "ruling", "opposition", "political", "campaign", "lawmaker",
  ],
  Technology: [
    "ai", "ml", "software", "programming", "api", "cloud", "cybersecurity",
    "semiconductor", "chip", "gpu", "tech", "apple", "google", "microsoft",
    "meta", "amazon", "openai", "chatgpt", "blockchain", "crypto", "startup",
    "algorithm", "data", "machine learning", "deep learning", "neural",
    "hacker", "code", "developer", "digital", "automation", "robot",
  ],
  Business: [
    "stock", "market", "economy", "gdp", "inflation", "revenue", "profit",
    "ipo", "funding", "investment", "bank", "finance", "trade", "commerce",
    "industry", "corporate", "merger", "acquisition", "startup", "unicorn",
    "venture", "capital", "rupee", "dollar", "fiscal", "monetary",
  ],
  Sports: [
    "cricket", "football", "soccer", "tennis", "olympics", "ipl", "world cup",
    "match", "tournament", "player", "team", "score", "win", "championship",
    "league", "nba", "fifa", "athlete", "medal", "coach", "game", "goal",
  ],
  Entertainment: [
    "movie", "film", "bollywood", "hollywood", "music", "actor", "actress",
    "celebrity", "netflix", "amazon prime", "disney", "concert", "album",
    "song", "tv show", "series", "streaming", "oscars", "award", "festival",
  ],
  Health: [
    "health", "hospital", "doctor", "disease", "vaccine", "covid", "pandemic",
    "medical", "treatment", "drug", "pharma", "who", "mental health", "fitness",
    "diet", "cancer", "surgery", "clinical", "patient", "symptom",
  ],
  Science: [
    "science", "research", "nasa", "space", "physics", "chemistry", "biology",
    "quantum", "experiment", "discovery", "laboratory", "scientist", "journal",
    "peer review", "hypothesis", "telescope", "mars", "moon", "climate",
  ],
  World: [
    "war", "conflict", "ukraine", "russia", "china", "diplomacy", "nato",
    "united nations", "treaty", "sanctions", "refugee", "border", "military",
    "attack", "strike", "ceasefire", "peace", "global", "international",
  ],
  Social: ["mastodon", "twitter", "social media", "viral", "trending", "post", "tweet"],
  Reference: ["wikipedia", "wikidata", "encyclopedia", "update", "edit", "entity", "structured", "fact"],
  General: [],
};

export function detectCategory(
  headline: string,
  source: string,
  summary?: string,
): CategoryType {
  const text = `${headline} ${source} ${summary ?? ""}`.toLowerCase();

  // Source-based detection (high confidence)
  if (/hacker news|techcrunch|arstechnica|wired|the verge/i.test(source))
    return "Technology";
  if (/wikipedia/i.test(source)) return "Reference";
  if (/wikidata/i.test(source)) return "Reference";   // FIX 4: was "Entity"
  if (/mastodon/i.test(source)) return "Social";
  if (/ndtv|the hindu|economic times|reuters|bbc/i.test(source)) {
    const lower = headline.toLowerCase();
    if (CATEGORY_KEYWORDS.Politics.some((kw) => lower.includes(kw)))
      return "Politics";
    if (CATEGORY_KEYWORDS.Business.some((kw) => lower.includes(kw)))
      return "Business";
    if (CATEGORY_KEYWORDS.Sports.some((kw) => lower.includes(kw)))
      return "Sports";
    return "World";
  }

  // Keyword-based detection
  let bestCategory: CategoryType = "General";
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [CategoryType, string[]][]) {
    if (cat === "General") continue;
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  return bestScore > 0 ? bestCategory : "General";
}

/* ─── Deterministic Score Helper (FIX 2) ────────────────── */

function deterministicScore(text: string, salt: string, min: number, max: number): number {
  let hash = 0;
  const input = text + salt;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash) / 2147483647;
  return Math.round(min + normalized * (max - min));
}

/* ─── Recency Filter ────────────────────────────────────── */

export function isWithinLastDays(dateStr: string, maxDays: number): boolean {
  if (!dateStr) return false;
  try {
    let date: Date;
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      date = new Date(parsed);
    } else {
      const asNum = Number(dateStr);
      if (!isNaN(asNum) && asNum > 1_000_000_000) {
        date = new Date(asNum < 1e12 ? asNum * 1000 : asNum);
      } else {
        return false;
      }
    }
    const now = new Date();
    const ageMs = now.getTime() - date.getTime();
    const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;
    return ageMs >= 0 && ageMs <= maxAgeMs;
  } catch {
    return false;
  }
}

/* ─── General Helpers ───────────────────────────────────── */

export function generateId(url: string, headline: string, index: number): string {
  try {
    const hash = createHash("md5").update(url + headline).digest("hex");
    return hash.substring(0, 12);
  } catch {
    return String(index).padStart(4, "0");
  }
}

export function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toHumanTimestamp(dateStr: string): string {
  if (!dateStr) return "Unknown";
  try {
    let date: Date;
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      date = new Date(parsed);
    } else {
      const asNum = Number(dateStr);
      if (!isNaN(asNum) && asNum > 1_000_000_000) {
        date = new Date(asNum < 1e12 ? asNum * 1000 : asNum);
      } else {
        return dateStr;
      }
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "Just now";
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);
    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
    if (diffWeek < 5) return `${diffWeek} week${diffWeek > 1 ? "s" : ""} ago`;
    if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? "s" : ""} ago`;
    return `${diffYear} year${diffYear > 1 ? "s" : ""} ago`;
  } catch {
    return dateStr;
  }
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ─── Computation Functions ─────────────────────────────── */

export function computeSentiment(text: string): { label: string; score: number } {
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/);

  let positiveCount = 0;
  let negativeCount = 0;

  // FIX 3: Single pass only — removed the second regex pass that double-counted
  for (const word of words) {
    if (POSITIVE_WORDS.includes(word)) positiveCount++;
    if (NEGATIVE_WORDS.includes(word)) negativeCount++;
  }

  const total = positiveCount + negativeCount;

  if (total === 0) return { label: "neutral", score: 0.5 };

  if (positiveCount > negativeCount) {
    const score = Math.min(0.95, 0.5 + (positiveCount / (total * 2)) * 0.45);
    return { label: "positive", score: Math.round(score * 100) / 100 };
  }
  if (negativeCount > positiveCount) {
    const score = Math.min(0.95, 0.5 + (negativeCount / (total * 2)) * 0.45);
    return { label: "negative", score: Math.round(score * 100) / 100 };
  }

  return { label: "neutral", score: 0.5 };
}

export function extractEntities(text: string): Array<{ text: string; type: string }> {
  const entities: Array<{ text: string; type: string }> = [];
  const seen = new Set<string>();

  const regex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const entityText = match[1].trim();
    if (seen.has(entityText.toLowerCase())) continue;
    seen.add(entityText.toLowerCase());

    if (/^(The|This|That|These|Those|And|But|For|Not|With|From)\b/.test(entityText)) continue;

    const lower = entityText.toLowerCase();
    let type = "Topic";

    if (ORG_KEYWORDS.some((kw) => lower.includes(kw))) {
      type = "Organization";
    } else if (LOC_KEYWORDS.some((kw) => lower.includes(kw))) {
      type = "Location";
    } else if (entityText.split(" ").length >= 2) {
      type = "Person";
    }

    entities.push({ text: entityText, type });
  }

  return entities.slice(0, 5);
}

// FIX 2: Replaced Math.random() with deterministic hash
export function computeRiskScore(
  sentiment: { label: string; score: number },
  entityCount: number,
  text: string,
): number {
  const sentimentComponent =
    sentiment.label === "negative"
      ? sentiment.score * 40
      : (1 - sentiment.score) * 20;

  const entityComponent = Math.min(entityCount / 5, 1) * 30;
  const hashComponent = deterministicScore(text, "risk", 0, 20);

  const raw = sentimentComponent + entityComponent + hashComponent;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

// FIX 2: Replaced Math.random() with deterministic hash
export function computeTrendScore(
  headline: string,
  keyword: string,
  publishedAt: string,
  source: string,
  hnScore?: number,
): number {
  let score = 0;

  if (new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i").test(headline)) {
    score += 15;
  }

  try {
    const pubDate = new Date(publishedAt);
    const now = new Date();
    const ageHours = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60);
    if (ageHours < 1) score += 25;
    else if (ageHours < 6) score += 20;
    else if (ageHours < 24) score += 15;
    else if (ageHours < 48) score += 10;
    else score += 5;
  } catch {
    score += 5;
  }

  const sourceLower = source.toLowerCase();
  if (sourceLower.includes("hacker news")) score += 10;
  else if (
    sourceLower.includes("reuters") ||
    sourceLower.includes("ndtv") ||
    sourceLower.includes("hindu")
  )
    score += 8;
  else if (sourceLower.includes("wikipedia")) score += 5;
  else if (sourceLower.includes("wikidata")) score += 6;
  else if (sourceLower.includes("mastodon")) score += 4;
  else score += 6;

  if (hnScore !== undefined && hnScore > 0) {
    score += Math.min(hnScore / 10, 20);
  }

  score += deterministicScore(headline + source, "trend", 0, 10);

  return Math.round(Math.max(0, Math.min(100, score)));
}

export function computeClusterId(headline: string): string {
  const prefix = headline
    .substring(0, 30)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  try {
    const hash = createHash("md5").update(prefix).digest("hex");
    return `cluster-${hash.substring(0, 8)}`;
  } catch {
    return `cluster-${prefix.substring(0, 8)}`;
  }
}

export function computeRelatedCount(
  article: RawArticle,
  allArticles: RawArticle[],
): number {
  let count = 0;
  for (const other of allArticles) {
    if (other.url === article.url) continue;
    if (other.source === article.source) {
      count++;
      continue;
    }
    try {
      const aDate = new Date(article.publishedAt);
      const bDate = new Date(other.publishedAt);
      const diffHours = Math.abs(aDate.getTime() - bDate.getTime()) / (1000 * 60 * 60);
      if (diffHours < 6) {
        count++;
      }
    } catch {
      // skip
    }
  }
  return count;
}

export function generateWhyItMatters(
  sentiment: { label: string; score: number },
  entities: Array<{ text: string; type: string }>,
): string {
  const topEntity = entities[0];

  if (sentiment.label === "negative") {
    if (topEntity?.type === "Organization") {
      return `${topEntity.text} faces negative media attention. Monitor stakeholder reactions and prepare communication strategies.`;
    }
    if (topEntity?.type === "Person") {
      return `${topEntity.text} is at the center of negative coverage. Assess potential reputational impact.`;
    }
    if (topEntity?.type === "Location") {
      return `Negative developments reported in ${topEntity.text}. Evaluate regional implications.`;
    }
    return "Negative sentiment detected in coverage. Monitor for escalation and stakeholder impact.";
  }

  if (sentiment.label === "positive") {
    if (topEntity?.type === "Organization") {
      return `${topEntity.text} receiving positive coverage. Leverage for brand amplification and stakeholder engagement.`;
    }
    if (topEntity?.type === "Person") {
      return `${topEntity.text} associated with positive developments. Consider amplifying through channels.`;
    }
    return "Positive sentiment detected. Opportunity for strategic engagement and visibility.";
  }

  if (topEntity) {
    return `Coverage involving ${topEntity.text} warrants monitoring for sentiment shifts and follow-up developments.`;
  }

  return "Neutral coverage detected. Continue monitoring for sentiment changes or escalation.";
}

export function generateSuggestedAction(riskScore: number): string {
  if (riskScore > 70) {
    return "URGENT: Monitor closely. Prepare response strategy and escalation protocols. Alert relevant stakeholders.";
  }
  if (riskScore > 50) {
    return "ELEVATED: Track developments. Draft contingency messaging and brief leadership on potential scenarios.";
  }
  if (riskScore > 30) {
    return "MODERATE: Keep under observation. Schedule periodic review and update briefing materials.";
  }
  return "LOW: Routine monitoring sufficient. No immediate action required at this time.";
}

export function generateSummary(headline: string, existingSummary?: string): string {
  if (existingSummary && existingSummary.length > 20) {
    const combined = `${headline}. ${existingSummary}`;
    return combined.substring(0, 300);
  }
  return headline;
}

/* ─── URL Deduplication Helper ─────────────────────────── */

export function deduplicateByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.url.toLowerCase().trim().replace(/\/+$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ─── Data Source Fetchers ───────────────────────────────── */

export async function fetchGdelt(keyword: string): Promise<RawArticle[]> {
  const url =
    `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(keyword)}&mode=artlist&maxrecords=25&format=json&timespan=7200`;
  const res = await fetch(url, {
    headers: { "User-Agent": "VeeTrack/1.0" },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return [];

  const data = await res.json();
  const articles = data.articles ?? [];

  return articles.map((a: Record<string, unknown>) => ({
    headline: (a.title as string) ?? "",
    source: (a.domain as string) ?? "GDELT",
    url: (a.url as string) ?? "",
    publishedAt: (a.seendate as string) ?? "",
  }));
}

export async function fetchHackerNews(keyword: string): Promise<RawArticle[]> {
  const fiveDaysAgo = Math.floor(Date.now() / 1000) - 5 * 24 * 60 * 60;
  const url =
    `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&tags=story&hitsPerPage=15&numericFilters=created_at_i>${fiveDaysAgo}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "VeeTrack/1.0" },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return [];

  const data = await res.json();
  const hits = data.hits ?? [];

  return hits.map((h: Record<string, unknown>) => ({
    headline: (h.title as string) ?? "",
    source: "Hacker News",
    url:
      (h.url as string) ??
      `https://news.ycombinator.com/item?id=${h.objectID}`,
    publishedAt: (h.created_at as string) ?? "",
    hnScore: (h.points as number) ?? 0,
    hnComments: (h.num_comments as number) ?? 0,
  }));
}

async function fetchRssFeed(
  feedUrl: string,
  keyword: string,
): Promise<RawArticle[]> {
  const res = await fetch(feedUrl, {
    headers: { "User-Agent": "VeeTrack/1.0" },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return [];

  const xml = await res.text();
  const articles: RawArticle[] = [];

  const channelTitleMatch = xml.match(
    /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/,
  );
  const feedTitle = channelTitleMatch
    ? (channelTitleMatch[1] || channelTitleMatch[2] || feedUrl)
    : feedUrl;

  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemXml = itemMatch[1];

    const titleMatch = itemXml.match(
      /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/,
    );
    const title = titleMatch
      ? (titleMatch[1] || titleMatch[2] || "").trim()
      : "";

    const linkMatch = itemXml.match(
      /<link><!\[CDATA\[(.*?)\]\]><\/link>|<link>(.*?)<\/link>/,
    );
    const link = linkMatch
      ? (linkMatch[1] || linkMatch[2] || "").trim()
      : "";

    const descMatch = itemXml.match(
      /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/,
    );
    const description = descMatch
      ? stripHtmlTags(descMatch[1] || descMatch[2] || "")
      : "";

    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
    const pubDate = pubDateMatch
      ? pubDateMatch[1].trim()
      : "";

    if (!title && !description) continue;
    const keywordPattern = new RegExp(
      `\\b${escapeRegex(keyword)}\\b`,
      "i",
    );
    if (
      !keywordPattern.test(title) &&
      !keywordPattern.test(description)
    )
      continue;

    articles.push({
      headline: stripHtmlTags(title),
      source: feedTitle,
      url: link,
      publishedAt: pubDate,
      summary: description.substring(0, 200),
    });
  }

  return articles;
}

export async function fetchRssFeeds(keyword: string): Promise<RawArticle[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) => fetchRssFeed(feed, keyword)),
  );

  const articles: RawArticle[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    }
  }
  return articles;
}

export async function fetchMastodon(keyword: string): Promise<RawArticle[]> {
  const url =
    `https://mastodon.social/api/v2/search?q=${encodeURIComponent(keyword)}&type=statuses&limit=8`;
  const res = await fetch(url, {
    headers: { "User-Agent": "VeeTrack/1.0" },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return [];

  const data = await res.json();
  const statuses = data.statuses ?? [];

  return statuses.map((s: Record<string, unknown>) => {
    const content = stripHtmlTags((s.content as string) ?? "");
    const account = s.account as Record<string, unknown> | undefined;
    const displayName = (account?.display_name as string) ?? "unknown";
    return {
      headline: content.substring(0, 120),
      source: `Mastodon / ${displayName}`,
      url: (s.url as string) ?? "",
      publishedAt: (s.created_at as string) ?? "",
    };
  });
}

export async function fetchWikipedia(keyword: string): Promise<RawArticle[]> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&list=recentchanges&rcsearch=${encodeURIComponent(keyword)}&rcprop=title|timestamp|user|comment&rclimit=8&format=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "VeeTrack/1.0 (media-intelligence-platform)" },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return [];

  const data = await res.json();
  const changes = data.query?.recentchanges ?? [];

  return changes.map((rc: Record<string, unknown>) => {
    const title = (rc.title as string) ?? "";
    return {
      headline: `Wikipedia update: ${title}`,
      source: "Wikipedia",
      url: `https://en.wikipedia.org/wiki/${title.replace(/ /g, "_")}`,
      publishedAt: (rc.timestamp as string) ?? "",
      summary: (rc.comment as string) ?? "",
    };
  });
}

/* ─── Wikidata Entity Intelligence ─────────────────────── */

function extractWikidataValue(
  claim: Record<string, unknown>[],
  _detailData: Record<string, unknown>,
): string {
  try {
    const mainsnak = claim[0]?.mainsnak as Record<string, unknown> | undefined;
    if (!mainsnak) return "";
    const datavalue = mainsnak.datavalue as Record<string, unknown> | undefined;
    if (!datavalue) return "";
    const value = datavalue.value as Record<string, unknown> | undefined;
    if (!value) return "";

    if (datavalue.type === "wikibase-entityid") {
      const id = value.id as string;
      const entity = (_detailData.entities as Record<string, Record<string, unknown>>)?.[id];
      if (entity) {
        const labels = entity.labels as Record<string, Record<string, string>> | undefined;
        if (labels?.en?.value) return labels.en.value;
      }
      return id;
    }

    if (typeof value === "string") return value;
    if (value.text) return value.text as string;
    return "";
  } catch {
    return "";
  }
}

function extractWikidataTimeValue(
  claim: Record<string, unknown>[],
): string {
  try {
    const mainsnak = claim[0]?.mainsnak as Record<string, unknown> | undefined;
    if (!mainsnak) return "";
    const datavalue = mainsnak.datavalue as Record<string, unknown> | undefined;
    if (!datavalue) return "";
    const value = datavalue.value as Record<string, unknown> | undefined;
    if (!value) return "";

    const time = value.time as string;
    if (!time) return "";

    const match = time.match(/^[+-]?(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = match[1];
      const month = match[2];
      const day = match[3];
      if (month === "00" || day === "00") return year;
      return `${year}-${month}-${day}`;
    }
    return time;
  } catch {
    return "";
  }
}

function extractWikidataQuantityValue(
  claim: Record<string, unknown>[],
): string {
  try {
    const mainsnak = claim[0]?.mainsnak as Record<string, unknown> | undefined;
    if (!mainsnak) return "";
    const datavalue = mainsnak.datavalue as Record<string, unknown> | undefined;
    if (!datavalue) return "";
    const value = datavalue.value as Record<string, unknown> | undefined;
    if (!value) return "";

    const amount = value.amount as string;
    const unit = value.unit as string;
    if (!amount) return "";

    const numAmount = parseFloat(amount.replace("+", ""));
    let formatted = "";

    if (numAmount >= 1e9) {
      formatted = `$${(numAmount / 1e9).toFixed(1)}B`;
    } else if (numAmount >= 1e6) {
      formatted = `$${(numAmount / 1e6).toFixed(1)}M`;
    } else if (numAmount >= 1e3) {
      formatted = `${(numAmount / 1e3).toFixed(1)}K`;
    } else {
      formatted = numAmount.toLocaleString();
    }

    if (unit && unit.includes("Q4917")) {
      return `US$ ${(numAmount / 1e9).toFixed(1)} billion`;
    }

    return formatted;
  } catch {
    return "";
  }
}

export async function fetchWikidata(keyword: string): Promise<RawArticle[]> {
  // Step 1: Search for the entity
  const searchUrl =
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(keyword)}&language=en&limit=3&format=json`;
  const searchRes = await fetch(searchUrl, {
    headers: { "User-Agent": "VeeTrack/1.0 (media-intelligence-platform)" },
    signal: AbortSignal.timeout(8000),
  });

  if (!searchRes.ok) return [];

  const searchData = await searchRes.json();
  const results = searchData.search ?? [];
  if (results.length === 0) return [];

  // Step 2: Get detailed entity data for the top result
  const entityId = results[0].id as string;
  const entityLabel = (results[0].label as string) ?? keyword;
  const entityDesc = (results[0].description as string) ?? "";

  const detailUrl =
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=claims|labels|descriptions&languages=en&format=json`;
  const detailRes = await fetch(detailUrl, {
    headers: { "User-Agent": "VeeTrack/1.0 (media-intelligence-platform)" },
    signal: AbortSignal.timeout(8000),
  });

  if (!detailRes.ok) return [];

  const detailData = await detailRes.json();
  const entity = detailData.entities?.[entityId];
  if (!entity) return [];

  // Step 3: Extract structured facts from claims
  const facts: Record<string, string> = {};
  const claims = entity.claims ?? {};

  if (claims.P31) {
    const instanceOf = extractWikidataValue(claims.P31, detailData);
    if (instanceOf) facts["Type"] = instanceOf;
  }

  if (claims.P169) {
    const ceo = extractWikidataValue(claims.P169, detailData);
    if (ceo) facts["CEO / Head"] = ceo;
  }

  if (claims.P452) {
    const industry = extractWikidataValue(claims.P452, detailData);
    if (industry) facts["Industry"] = industry;
  }

  if (claims.P17) {
    const country = extractWikidataValue(claims.P17, detailData);
    if (country) facts["Country"] = country;
  } else if (claims.P495) {
    const country = extractWikidataValue(claims.P495, detailData);
    if (country) facts["Country"] = country;
  }

  if (claims.P571) {
    const founded = extractWikidataTimeValue(claims.P571);
    if (founded) facts["Founded"] = founded;
  }

  if (claims.P159) {
    const hq = extractWikidataValue(claims.P159, detailData);
    if (hq) facts["Headquarters"] = hq;
  }

  if (claims.P2139) {
    const revenue = extractWikidataQuantityValue(claims.P2139);
    if (revenue) facts["Revenue"] = revenue;
  }

  if (claims.P1128) {
    const employees = extractWikidataQuantityValue(claims.P1128);
    if (employees) facts["Employees"] = employees;
  }

  if (claims.P106) {
    const occupation = extractWikidataValue(claims.P106, detailData);
    if (occupation) facts["Occupation"] = occupation;
  }

  if (claims.P27) {
    const nationality = extractWikidataValue(claims.P27, detailData);
    if (nationality) facts["Nationality"] = nationality;
  }

  if (claims.P569) {
    const dob = extractWikidataTimeValue(claims.P569);
    if (dob) facts["Born"] = dob;
  }

  if (claims.P414) {
    const exchange = extractWikidataValue(claims.P414, detailData);
    if (exchange) facts["Listed on"] = exchange;
  }

  if (claims.P749) {
    const parent = extractWikidataValue(claims.P749, detailData);
    if (parent) facts["Parent Org"] = parent;
  }

  const factKeys = Object.keys(facts);
  if (factKeys.length === 0 && !entityDesc) return [];

  const factSummary = factKeys.map((k) => `${k}: ${facts[k]}`).join(" · ");

  return [{
    headline: `${entityLabel}${entityDesc ? ` — ${entityDesc}` : ""}`,
    source: "Wikidata",
    url: `https://www.wikidata.org/wiki/${entityId}`,
    publishedAt: new Date().toISOString(),
    summary: factSummary || entityDesc,
    wikidataFacts: facts,
  }];
}
