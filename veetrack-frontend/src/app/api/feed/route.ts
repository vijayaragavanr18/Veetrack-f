import { NextRequest, NextResponse } from "next/server";
import {
  type ArticleCard,
  type RawArticle,
  MAX_ARTICLE_AGE_DAYS,
  isWithinLastDays,
  generateId,
  toHumanTimestamp,
  computeSentiment,
  extractEntities,
  computeRiskScore,
  computeTrendScore,
  computeClusterId,
  computeRelatedCount,
  generateWhyItMatters,
  generateSuggestedAction,
  generateSummary,
  detectCategory,
  fetchGdelt,
  fetchHackerNews,
  fetchRssFeeds,
  fetchMastodon,
  fetchWikipedia,
  fetchWikidata,
  deduplicateByUrl,
} from "@/lib/feed-utils";

/* ─── POST Handler ───────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keyword = String(body.keyword ?? "").trim();
    const maxResults = Number(body.max_results ?? 30) || 30;

    if (!keyword) {
      return NextResponse.json(
        {
          keyword: "",
          articles: [],
          fetchedAt: new Date().toISOString(),
          sourceCount: 0,
        },
        { status: 200 },
      );
    }

    // Fetch all 6 data sources in parallel
    const [gdeltResult, hnResult, rssResult, mastodonResult, wikiResult, wikidataResult] =
      await Promise.allSettled([
        fetchGdelt(keyword),
        fetchHackerNews(keyword),
        fetchRssFeeds(keyword),
        fetchMastodon(keyword),
        fetchWikipedia(keyword),
        fetchWikidata(keyword),
      ]);

    const gdeltArticles =
      gdeltResult.status === "fulfilled" ? gdeltResult.value : [];
    const hnArticles =
      hnResult.status === "fulfilled" ? hnResult.value : [];
    const rssArticles =
      rssResult.status === "fulfilled" ? rssResult.value : [];
    const mastodonArticles =
      mastodonResult.status === "fulfilled" ? mastodonResult.value : [];
    const wikiArticles =
      wikiResult.status === "fulfilled" ? wikiResult.value : [];
    const wikidataArticles =
      wikidataResult.status === "fulfilled" ? wikidataResult.value : [];

    const sourceCount = [
      gdeltArticles,
      hnArticles,
      rssArticles,
      mastodonArticles,
      wikiArticles,
      wikidataArticles,
    ].filter((a) => a.length > 0).length;

    // Combine all articles
    const allRaw: RawArticle[] = [
      ...gdeltArticles,
      ...hnArticles,
      ...rssArticles,
      ...mastodonArticles,
      ...wikiArticles,
      ...wikidataArticles,
    ];

    // Filter out articles with empty or short headlines
    const headlineFiltered = allRaw.filter(
      (a) => a.headline && a.headline.trim().length >= 10,
    );

    // ★ MANDATORY: Filter to ONLY articles from the last 5 days
    const recencyFiltered = headlineFiltered.filter(
      (a) => isWithinLastDays(a.publishedAt, MAX_ARTICLE_AGE_DAYS),
    );
    const recencyRemoved = headlineFiltered.length - recencyFiltered.length;
    if (recencyRemoved > 0) {
      console.log(`[VeeTrack] Removed ${recencyRemoved} articles older than ${MAX_ARTICLE_AGE_DAYS} days`);
    }

    // Remove duplicate URLs (keep first occurrence)
    const deduplicated = deduplicateByUrl(recencyFiltered);

    // Cap at 40 articles, sorted by recency (newest first)
    const sorted = deduplicated.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime() || 0;
      const dateB = new Date(b.publishedAt).getTime() || 0;
      return dateB - dateA;
    });
    const capped = sorted.slice(0, 40);

    // Enrich articles
    const articles: ArticleCard[] = capped.map((raw, index) => {
      const articleText = raw.headline + " " + (raw.summary ?? "");
      const sentiment = computeSentiment(articleText);
      const entities = extractEntities(articleText);
      const riskScore = computeRiskScore(sentiment, entities.length, articleText);
      const trendScore = computeTrendScore(
        raw.headline,
        keyword,
        raw.publishedAt,
        raw.source,
        raw.hnScore,
      );
      const clusterId = computeClusterId(raw.headline);
      const relatedCount = computeRelatedCount(raw, capped);
      const id = generateId(raw.url, raw.headline, index);
      const category = detectCategory(raw.headline, raw.source, raw.summary);

      let sourceUrl = "";
      try {
        if (raw.url) {
          sourceUrl = new URL(raw.url).origin;
        }
      } catch {
        sourceUrl = "";
      }

      return {
        id,
        headline: raw.headline.trim(),
        source: raw.source || "Unknown",
        sourceUrl,
        timestamp: toHumanTimestamp(raw.publishedAt),
        publishedAt: raw.publishedAt,
        thumbnail: "",
        category,
        url: raw.url,
        sentiment,
        riskScore,
        trendScore,
        entities,
        summary: generateSummary(raw.headline, raw.summary),
        whyItMatters: generateWhyItMatters(sentiment, entities),
        suggestedAction: generateSuggestedAction(riskScore),
        clusterId,
        relatedCount,
      };
    });

    // Sort by trendScore descending, then cap at maxResults
    articles.sort((a, b) => b.trendScore - a.trendScore);
    const finalArticles = articles.slice(0, maxResults);

    return NextResponse.json(
      {
        keyword,
        articles: finalArticles,
        fetchedAt: new Date().toISOString(),
        sourceCount,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[VeeTrack Feed API] Error:", error);
    return NextResponse.json(
      {
        keyword: "",
        articles: [],
        fetchedAt: new Date().toISOString(),
        sourceCount: 0,
      },
      { status: 200 },
    );
  }
}
