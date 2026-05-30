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

/* ═══════════════════════════════════════════════════════════
   VEETRACK INTELLIGENCE API — Rule-Based Analysis
   
   Fetches from 6 free data sources (GDELT, RSS, Hacker News,
   Mastodon, Wikipedia, Wikidata) in parallel, then performs
   rule-based sentiment, entity, and risk analysis to produce
   a comprehensive intelligence report. No LLM required.
   ═══════════════════════════════════════════════════════════ */

/* ─── Types (unique to intelligence) ────────────────────── */

interface IntelligenceReport {
  keyword: string;
  generatedAt: string;
  articles: ArticleCard[];
  summary: {
    totalFound: number;
    bySource: Record<string, number>;
    sentimentBreakdown: { positive: number; negative: number; neutral: number };
    topEntities: Array<{ text: string; type: string }>;
    riskLevel: "low" | "medium" | "high" | "critical";
    avgRiskScore: number;
  };
  executiveBrief: {
    overview: string;
    keyDevelopments: string[];
    whyItMatters: string;
    recommendedAction: string;
  };
  wikidataFacts: Record<string, string> | null;
  errors: string[];
}

/* ─── Intelligence-Only Helpers ─────────────────────────── */

function determineRiskLevel(avgRiskScore: number): "low" | "medium" | "high" | "critical" {
  if (avgRiskScore >= 70) return "critical";
  if (avgRiskScore >= 50) return "high";
  if (avgRiskScore >= 30) return "medium";
  return "low";
}

function generateExecutiveOverview(
  keyword: string,
  totalFound: number,
  sourceCount: number,
  dominantSentiment: string,
  sentimentCounts: { positive: number; negative: number; neutral: number },
): string {
  if (totalFound === 0) {
    return `No significant coverage found for "${keyword}" in the past 5 days across monitored sources. The topic appears to have low media visibility at this time.`;
  }

  const sentimentDesc =
    dominantSentiment === "positive"
      ? "predominantly positive, indicating favorable media attention"
      : dominantSentiment === "negative"
        ? "predominantly negative, suggesting adverse media attention that warrants attention"
        : "largely neutral, indicating balanced or factual reporting without strong sentiment signals";

  const sourceDesc =
    sourceCount >= 5
      ? `across ${sourceCount} diverse sources, indicating broad coverage`
      : sourceCount >= 3
        ? `from ${sourceCount} sources, showing moderate coverage breadth`
        : `from only ${sourceCount} source(s), suggesting limited coverage`;

  return `Intelligence analysis for "${keyword}" identified ${totalFound} relevant articles ${sourceDesc} in the past 5 days. Coverage sentiment is ${sentimentDesc} (positive: ${sentimentCounts.positive}, negative: ${sentimentCounts.negative}, neutral: ${sentimentCounts.neutral}).`;
}

function generateExecutiveWhyItMatters(
  dominantSentiment: string,
  riskLevel: string,
  topEntities: Array<{ text: string; type: string }>,
  keyword: string,
): string {
  const entityContext =
    topEntities.length > 0
      ? ` Key entities involved include ${topEntities.slice(0, 3).map((e) => e.text).join(", ")}.`
      : "";

  if (riskLevel === "critical") {
    return `Coverage of "${keyword}" presents a critical risk profile with significant negative sentiment.${entityContext} Immediate stakeholder communication and crisis management protocols should be activated. The potential for narrative escalation is high.`;
  }

  if (riskLevel === "high") {
    return `Coverage of "${keyword}" shows elevated risk with concerning sentiment patterns.${entityContext} Proactive monitoring and prepared response strategies are recommended to mitigate potential reputational impact.`;
  }

  if (riskLevel === "medium") {
    return `Coverage of "${keyword}" presents moderate risk with mixed sentiment signals.${entityContext} Continued monitoring is advised, with attention to any shifts in narrative tone or volume.`;
  }

  if (dominantSentiment === "positive") {
    return `Coverage of "${keyword}" is largely favorable with low risk indicators.${entityContext} This presents opportunities for strategic amplification and positive narrative reinforcement.`;
  }

  return `Coverage of "${keyword}" shows low risk with stable sentiment patterns.${entityContext} Standard monitoring protocols are sufficient at this time.`;
}

function generateRecommendedAction(riskLevel: string): string {
  switch (riskLevel) {
    case "critical":
      return "Activate crisis communication protocol immediately. Convene stakeholder briefing within 2 hours. Prepare holding statements and designate spokesperson. Monitor coverage every 30 minutes for escalation. Engage legal counsel for liability assessment.";
    case "high":
      return "Escalate to senior communications team. Draft contingency messaging and prepare proactive statements. Brief key stakeholders within 4 hours. Increase monitoring frequency to hourly. Identify and engage friendly media contacts for balanced coverage.";
    case "medium":
      return "Maintain enhanced monitoring with daily briefings. Prepare draft responses for potential escalation scenarios. Update internal talking points and FAQ documents. Schedule review meeting within 48 hours to reassess risk level.";
    default:
      return "Continue routine monitoring with weekly summary reports. No immediate action required. Archive coverage data for trend analysis and future reference. Consider periodic keyword expansion to capture adjacent topics.";
  }
}

/* ─── POST Handler ───────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const keyword = String(body.keyword ?? "").trim();

    if (!keyword) {
      return NextResponse.json(
        {
          keyword: "",
          generatedAt: new Date().toISOString(),
          articles: [],
          summary: {
            totalFound: 0,
            bySource: {},
            sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
            topEntities: [],
            riskLevel: "low",
            avgRiskScore: 0,
          },
          executiveBrief: {
            overview: "No keyword provided for analysis.",
            keyDevelopments: [],
            whyItMatters: "No analysis possible without a search keyword.",
            recommendedAction: "Provide a keyword to generate an intelligence report.",
          },
          wikidataFacts: null,
          errors: ["No keyword provided"],
        },
        { status: 200 },
      );
    }

    const errors: string[] = [];

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

    // Collect errors from failed fetches
    if (gdeltResult.status === "rejected") errors.push(`GDELT: ${gdeltResult.reason?.message || "fetch failed"}`);
    if (hnResult.status === "rejected") errors.push(`Hacker News: ${hnResult.reason?.message || "fetch failed"}`);
    if (rssResult.status === "rejected") errors.push(`RSS: ${rssResult.reason?.message || "fetch failed"}`);
    if (mastodonResult.status === "rejected") errors.push(`Mastodon: ${mastodonResult.reason?.message || "fetch failed"}`);
    if (wikiResult.status === "rejected") errors.push(`Wikipedia: ${wikiResult.reason?.message || "fetch failed"}`);
    if (wikidataResult.status === "rejected") errors.push(`Wikidata: ${wikidataResult.reason?.message || "fetch failed"}`);

    // Extract Wikidata facts if available
    const wikidataFacts: Record<string, string> | null =
      wikidataArticles.length > 0 && wikidataArticles[0].wikidataFacts
        ? wikidataArticles[0].wikidataFacts
        : null;

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

    // Filter to ONLY articles from the last 5 days
    const recencyFiltered = headlineFiltered.filter(
      (a) => isWithinLastDays(a.publishedAt, MAX_ARTICLE_AGE_DAYS),
    );

    // Remove duplicate URLs (keep first occurrence)
    const deduplicated = deduplicateByUrl(recencyFiltered);

    // Sort by recency (newest first), cap at 50
    const sorted = deduplicated.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime() || 0;
      const dateB = new Date(b.publishedAt).getTime() || 0;
      return dateB - dateA;
    });
    const capped = sorted.slice(0, 50);

    // Enrich articles with sentiment, entities, risk, trend, etc.
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

    // Sort by trendScore descending
    articles.sort((a, b) => b.trendScore - a.trendScore);

    /* ─── Compute Summary Statistics ─────────────────────── */

    const bySource: Record<string, number> = {};
    for (const article of articles) {
      bySource[article.source] = (bySource[article.source] || 0) + 1;
    }

    const sentimentBreakdown = {
      positive: articles.filter((a) => a.sentiment.label === "positive").length,
      negative: articles.filter((a) => a.sentiment.label === "negative").length,
      neutral: articles.filter((a) => a.sentiment.label === "neutral").length,
    };

    // Determine dominant sentiment
    const dominantSentiment =
      sentimentBreakdown.positive > sentimentBreakdown.negative &&
      sentimentBreakdown.positive > sentimentBreakdown.neutral
        ? "positive"
        : sentimentBreakdown.negative > sentimentBreakdown.neutral
          ? "negative"
          : "neutral";

    // Aggregate top entities across all articles
    const entityMap = new Map<string, { text: string; type: string; count: number }>();
    for (const article of articles) {
      for (const entity of article.entities) {
        const key = entity.text.toLowerCase();
        const existing = entityMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          entityMap.set(key, { text: entity.text, type: entity.type, count: 1 });
        }
      }
    }
    const topEntities = Array.from(entityMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(({ text, type }) => ({ text, type }));

    // Compute average risk score
    const avgRiskScore =
      articles.length > 0
        ? Math.round(
            articles.reduce((sum, a) => sum + a.riskScore, 0) / articles.length,
          )
        : 0;

    const riskLevel = determineRiskLevel(avgRiskScore);

    /* ─── Generate Executive Brief (Rule-Based) ──────────── */

    const sourceCount = [
      gdeltArticles,
      hnArticles,
      rssArticles,
      mastodonArticles,
      wikiArticles,
      wikidataArticles,
    ].filter((a) => a.length > 0).length;

    const overview = generateExecutiveOverview(
      keyword,
      articles.length,
      sourceCount,
      dominantSentiment,
      sentimentBreakdown,
    );

    const keyDevelopments = articles
      .slice(0, 5)
      .map((a) => a.headline);

    const whyItMatters = generateExecutiveWhyItMatters(
      dominantSentiment,
      riskLevel,
      topEntities,
      keyword,
    );

    const recommendedAction = generateRecommendedAction(riskLevel);

    /* ─── Build Final Report ─────────────────────────────── */

    const report: IntelligenceReport = {
      keyword,
      generatedAt: new Date().toISOString(),
      articles,
      summary: {
        totalFound: articles.length,
        bySource,
        sentimentBreakdown,
        topEntities,
        riskLevel,
        avgRiskScore,
      },
      executiveBrief: {
        overview,
        keyDevelopments,
        whyItMatters,
        recommendedAction,
      },
      wikidataFacts,
      errors,
    };

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error("[VeeTrack Intelligence API] Error:", error);
    const message = error instanceof Error ? error.message : "Intelligence analysis failed";
    return NextResponse.json(
      {
        keyword: "",
        generatedAt: new Date().toISOString(),
        articles: [],
        summary: {
          totalFound: 0,
          bySource: {},
          sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
          topEntities: [],
          riskLevel: "low",
          avgRiskScore: 0,
        },
        executiveBrief: {
          overview: `Analysis failed: ${message}`,
          keyDevelopments: [],
          whyItMatters: "Unable to generate analysis due to a processing error.",
          recommendedAction: "Retry the analysis. If the error persists, check data source availability.",
        },
        wikidataFacts: null,
        errors: [message],
      },
      { status: 200 },
    );
  }
}
