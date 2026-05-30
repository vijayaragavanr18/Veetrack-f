"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Triangle, Database, ExternalLink } from "lucide-react";
import { Article, getEntityTexts } from "@/lib/data/articles";

/* ─── Types ───────────────────────────────────────────── */

interface MastodonStatus {
  id: string;
  content: string;
  url: string;
  created_at: string;
  account: {
    display_name: string;
    username: string;
  };
}

interface HNResult {
  id: string;
  title: string;
  points: number;
  numComments: number;
  url: string;
  author: string;
}

interface WikidataEntity {
  label: string;
  description: string;
  entityId: string;
  facts: Record<string, string>;
  url: string;
}

interface ReactionData {
  mastodon: MastodonStatus[];
  hackernews: HNResult[];
  wikidata: WikidataEntity | null;
}

/* ─── Skeleton ────────────────────────────────────────── */

function ReactionSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-24">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4 animate-pulse">
          <div className="h-3 w-20 rounded bg-[#F1F5F9] mb-2" />
          <div className="h-4 w-3/4 rounded bg-[#F1F5F9] mb-1" />
          <div className="h-3 w-1/2 rounded bg-[#F1F5F9]" />
        </div>
      ))}
    </div>
  );
}

/* ─── Crowd Mood Bar ──────────────────────────────────── */

function CrowdMoodBar({ posts }: { posts: MastodonStatus[] }) {
  if (posts.length === 0) return null;

  const positiveCount = posts.filter((p) => p.content.length > 50).length;
  const ratio = positiveCount / posts.length;
  const positivePct = Math.round(ratio * 100);
  const moodLabel =
    ratio > 0.7
      ? "Mostly Positive"
      : ratio > 0.4
        ? "Mixed"
        : "Controversial";

  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-[10px] text-[#6B7280]"
        style={{ fontFamily: "var(--font-poppins), monospace" }}
      >
        Public Mood: {moodLabel}
      </span>
      <div className="flex h-2 rounded-full overflow-hidden">
        <div
          className="bg-[#22C55E] transition-all duration-500"
          style={{ width: `${positivePct}%` }}
        />
        <div
          className="bg-[#EF4444] transition-all duration-500"
          style={{ width: `${100 - positivePct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Wikidata Entity Card ────────────────────────────── */

function WikidataCard({ entity }: { entity: WikidataEntity }) {
  const factEntries = Object.entries(entity.facts);
  if (factEntries.length === 0 && !entity.description) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2 border-b border-[#F1F5F9]">
        <Database className="w-4 h-4 text-[#006699]" />
        <span
          className="text-xs text-[#374151] font-medium"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          Entity Intelligence
        </span>
        <span className="text-[9px] text-[#9CA3AF] ml-auto">Wikidata</span>
      </div>

      {/* Entity name + description */}
      <div className="px-4 pt-3 pb-2">
        <h4
          className="text-[#1A1A2E] text-sm font-semibold"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          {entity.label}
        </h4>
        {entity.description && (
          <p className="text-[#6B7280] text-xs mt-0.5">{entity.description}</p>
        )}
      </div>

      {/* Structured facts */}
      {factEntries.length > 0 && (
        <div className="px-4 pb-3 flex flex-col gap-1.5">
          {factEntries.map(([key, value]) => (
            <div key={key} className="flex items-baseline gap-2">
              <span
                className="text-[10px] text-[#9CA3AF] min-w-[80px] shrink-0"
                style={{ fontFamily: "var(--font-poppins), monospace" }}
              >
                {key}
              </span>
              <span
                className="text-xs text-[#1A1A2E]"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Link to Wikidata */}
      <div className="px-4 pb-3">
        <a
          href={entity.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-[#006699] hover:underline"
          style={{ fontFamily: "var(--font-poppins), monospace" }}
        >
          <ExternalLink className="w-3 h-3" />
          View on Wikidata
        </a>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PUBLIC REACTION TAB
   ═══════════════════════════════════════════════════════════ */

interface PublicReactionTabProps {
  article: Article;
  isTechnology: boolean;
}

export default function PublicReactionTab({ article, isTechnology }: PublicReactionTabProps) {
  const [data, setData] = useState<ReactionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const fetchAttempted = useRef(false);

  // Use first entity or first 3 words of headline as search keyword
  const entityTexts = getEntityTexts(article.entities);
  const keyword = entityTexts[0] ?? article.headline.split(" ").slice(0, 3).join(" ");

  const fetchData = useCallback(async () => {
    if (fetchAttempted.current) return;
    fetchAttempted.current = true;
    setIsLoading(true);

    try {
      // Route through Next.js API proxy instead of calling external APIs directly
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          sources: ["mastodon", "hackernews", "wikidata"],
        }),
      });

      if (!res.ok) {
        throw new Error(`Reactions API returned ${res.status}`);
      }

      const json: ReactionData = await res.json();
      setData(json);
    } catch {
      setData({
        mastodon: [],
        hackernews: [],
        wikidata: null,
      });
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [keyword]);

  // Trigger fetch on mount (fetchAttempted ref prevents double-invocation)
  useEffect(() => {
    if (!fetchAttempted.current) {
      fetchData();
    }
  }, [keyword, fetchData]);

  if (isLoading || !hasFetched) {
    return <ReactionSkeleton />;
  }

  if (!data) return null;

  const hasAnyData = data.mastodon.length > 0 || data.hackernews.length > 0 || data.wikidata !== null;

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-24 overflow-y-auto max-h-[calc(100vh-30vh-120px)]">
      {/* Section label */}
      <span
        className="text-[10px] text-[#9CA3AF] tracking-widest uppercase"
        style={{ fontFamily: "var(--font-poppins), monospace" }}
      >
        Public Reaction & Entity Data
      </span>

      {/* ── Wikidata Entity Section ── */}
      {data.wikidata && <WikidataCard entity={data.wikidata} />}

      {/* ── Mastodon Section ── */}
      {data.mastodon.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#6364FF]" />
            <span
              className="text-xs text-[#374151] font-medium"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              Mastodon
            </span>
          </div>

          <CrowdMoodBar posts={data.mastodon} />

          <div className="flex flex-col gap-2">
            {data.mastodon.map((status, i) => (
              <motion.a
                key={status.id}
                href={status.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.08 }}
                className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-3.5 flex flex-col gap-2 hover:border-[#6364FF]/30 transition-colors duration-200"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#6364FF]/70 font-medium">@{status.account.username}</span>
                  <span className="text-[10px] text-[#9CA3AF]">·</span>
                  <span className="text-[10px] text-[#9CA3AF]">{status.account.display_name}</span>
                </div>
                <span
                  className="text-[#1A1A2E] text-sm leading-snug line-clamp-3"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  {status.content.substring(0, 200)}
                </span>
              </motion.a>
            ))}
          </div>
        </div>
      )}

      {/* ── HackerNews Section ── */}
      {isTechnology && data.hackernews.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Triangle className="w-4 h-4 text-[#FF6600]" />
            <span
              className="text-xs text-[#374151] font-medium"
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              Hacker News
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {data.hackernews.map((hit, i) => (
              <motion.a
                key={hit.id}
                href={hit.url.startsWith("http") ? hit.url : `https://news.ycombinator.com/item?id=${hit.id}`}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.08 }}
                className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-3.5 flex flex-col gap-1.5 hover:border-[#FF6600]/30 transition-colors duration-200"
              >
                <span
                  className="text-[#1A1A2E] text-sm leading-snug line-clamp-2"
                  style={{ fontFamily: "var(--font-poppins), monospace" }}
                >
                  {hit.title}
                </span>
                <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF]">
                  <span>▲ {hit.points} pts</span>
                  <span>·</span>
                  <span>{hit.numComments} comments</span>
                  <span>·</span>
                  <span>by {hit.author}</span>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAnyData && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <MessageSquare className="w-8 h-8 text-[#D1D5DB]" />
          <p className="text-[#9CA3AF] text-sm">No public reaction data found for this topic.</p>
        </div>
      )}
    </div>
  );
}
