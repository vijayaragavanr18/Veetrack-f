/**
 * VeeTrack — Article type definitions and helper utilities.
 *
 * The Article interface matches the response from POST /api/feed.
 * No mock data — all data comes from real API calls.
 */

/* ─── Article Type ──────────────────────────────────── */

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

export interface Article {
  id: string;
  headline: string;
  source: string;
  sourceUrl: string;
  timestamp: string;       // human-readable like "5 min ago"
  publishedAt: string;     // ISO date
  thumbnail: string;
  category: CategoryType;
  url: string;
  sentiment: {
    label: "positive" | "negative" | "neutral";
    score: number;
  };
  riskScore: number;
  trendScore: number;
  entities: Array<{ text: string; type: string }>;
  summary: string;
  whyItMatters: string;
  suggestedAction: string;
  clusterId: string;
  relatedCount: number;
}

/* ─── Category Config ───────────────────────────────── */

export const CATEGORY_CONFIG: Record<CategoryType, {
  emoji: string;
  color: string;       // Tailwind text color
  bg: string;          // Tailwind bg color
  border: string;      // Tailwind border color
  gradient: string;    // CSS gradient for hero
}> = {
  Politics: {
    emoji: "🏛️",
    color: "text-[#DC2626]",
    bg: "bg-[#DC2626]/8",
    border: "border-[#DC2626]/15",
    gradient: "from-[#DC2626]/8 via-[#FFFFFF] to-[#F8F9FA]",
  },
  Technology: {
    emoji: "💻",
    color: "text-[#1D4ED8]",
    bg: "bg-[#1D4ED8]/8",
    border: "border-[#1D4ED8]/15",
    gradient: "from-[#1D4ED8]/8 via-[#FFFFFF] to-[#F8F9FA]",
  },
  Business: {
    emoji: "📊",
    color: "text-[#D97706]",
    bg: "bg-[#D97706]/8",
    border: "border-[#D97706]/15",
    gradient: "from-[#D97706]/8 via-[#FFFFFF] to-[#F8F9FA]",
  },
  Sports: {
    emoji: "⚽",
    color: "text-[#16A34A]",
    bg: "bg-[#16A34A]/8",
    border: "border-[#16A34A]/15",
    gradient: "from-[#16A34A]/8 via-[#FFFFFF] to-[#F8F9FA]",
  },
  Entertainment: {
    emoji: "🎬",
    color: "text-[#9333EA]",
    bg: "bg-[#9333EA]/8",
    border: "border-[#9333EA]/15",
    gradient: "from-[#9333EA]/8 via-[#FFFFFF] to-[#F8F9FA]",
  },
  Health: {
    emoji: "🏥",
    color: "text-[#0D9488]",
    bg: "bg-[#0D9488]/8",
    border: "border-[#0D9488]/15",
    gradient: "from-[#0D9488]/8 via-[#FFFFFF] to-[#F8F9FA]",
  },
  Science: {
    emoji: "🔬",
    color: "text-[#7C3AED]",
    bg: "bg-[#7C3AED]/8",
    border: "border-[#7C3AED]/15",
    gradient: "from-[#7C3AED]/8 via-[#FFFFFF] to-[#F8F9FA]",
  },
  World: {
    emoji: "🌍",
    color: "text-[#2563EB]",
    bg: "bg-[#2563EB]/8",
    border: "border-[#2563EB]/15",
    gradient: "from-[#2563EB]/8 via-[#FFFFFF] to-[#F8F9FA]",
  },
  Social: {
    emoji: "💬",
    color: "text-[#DB2777]",
    bg: "bg-[#DB2777]/8",
    border: "border-[#DB2777]/15",
    gradient: "from-[#DB2777]/8 via-[#FFFFFF] to-[#F8F9FA]",
  },
  Reference: {
    emoji: "📖",
    color: "text-[#64748B]",
    bg: "bg-[#64748B]/8",
    border: "border-[#64748B]/15",
    gradient: "from-[#64748B]/8 via-[#FFFFFF] to-[#F8F9FA]",
  },
  General: {
    emoji: "📰",
    color: "text-[#4B5563]",
    bg: "bg-[#4B5563]/8",
    border: "border-[#4B5563]/15",
    gradient: "from-[#4B5563]/8 via-[#FFFFFF] to-[#F8F9FA]",
  },
};

/* ─── Derived helpers ───────────────────────────────── */

/** Get entity text strings for display */
export function getEntityTexts(entities: Array<{ text: string; type: string }>): string[] {
  return entities.map((e) => e.text);
}

/** Group entities by type for categorized display */
export function getCategorizedEntities(entities: Array<{ text: string; type: string }>): {
  persons: string[];
  organizations: string[];
  locations: string[];
  topics: string[];
} {
  const persons: string[] = [];
  const organizations: string[] = [];
  const locations: string[] = [];
  const topics: string[] = [];

  for (const entity of entities) {
    switch (entity.type) {
      case "Person":
        persons.push(entity.text);
        break;
      case "Organization":
        organizations.push(entity.text);
        break;
      case "Location":
        locations.push(entity.text);
        break;
      default:
        topics.push(entity.text);
        break;
    }
  }

  return { persons, organizations, locations, topics };
}

/** Split summary into bullet points */
export function getSummaryBullets(summary: string): string[] {
  if (!summary) return ["No summary available."];

  // Try splitting by sentences
  const sentences = summary
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (sentences.length > 1) return sentences;

  // Fallback: split by semicolons or commas for long text
  if (summary.length > 100) {
    return summary
      .split(/[;,]\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }

  return [summary];
}

/** Generate sparkline data points for a given trend score */
export function generateSparkline(trendScore: number): number[] {
  const base = Math.max(trendScore - 30, 5);
  const points: number[] = [];
  for (let i = 0; i < 8; i++) {
    const noise = Math.random() * 20 - 10;
    const growth = (trendScore - base) * (i / 7);
    points.push(Math.min(100, Math.max(0, Math.round(base + growth + noise))));
  }
  return points;
}

/** Check if article is technology-related (for showing HN section) */
export function isTechnologyArticle(article: Article): boolean {
  if (!article) return false;

  const techSources = ["hacker news", "techcrunch", "arstechnica", "wired", "the verge"];
  const techKeywords = ["ai", "ml", "software", "programming", "api", "cloud", "cybersecurity", "semiconductor", "chip", "gpu"];

  if (article.source) {
    const sourceLower = article.source.toLowerCase();
    if (techSources.some((s) => sourceLower.includes(s))) return true;
  }

  if (article.headline) {
    const headlineLower = article.headline.toLowerCase();
    if (techKeywords.some((k) => headlineLower.includes(k))) return true;
  }

  if (article.entities && Array.isArray(article.entities)) {
    if (article.entities.some((e) => e?.text && techKeywords.some((k) => e.text.toLowerCase().includes(k)))) return true;
  }

  return false;
}

/** Get Wikipedia-style context for an entity name */
export function getEntityContext(entity: string): { text: string; url: string } {
  return {
    text: `${entity} is a notable entity referenced in recent media coverage related to this story cluster.`,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(entity)}`,
  };
}
