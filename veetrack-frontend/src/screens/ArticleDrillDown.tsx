"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, TrendingUp, AlertTriangle, ExternalLink } from "lucide-react";
import { useKeywordStore } from "@/lib/stores/keyword-store";
import { useChatStore } from "@/lib/stores/chat-store";
import {
  getCategorizedEntities,
  getSummaryBullets,
  isTechnologyArticle,
  CATEGORY_CONFIG,
} from "@/lib/data/articles";
import KeyPointsTab from "@/components/tabs/KeyPointsTab";
import RelatedTimelineTab from "@/components/tabs/RelatedTimelineTab";
import PublicReactionTab from "@/components/tabs/PublicReactionTab";
import ArticleChat, { ChatBubble } from "@/components/chat/ArticleChat";

/* ─── Types ───────────────────────────────────────────── */

type TabId = "keypoints" | "timeline" | "reaction";

const TABS: { id: TabId; label: string }[] = [
  { id: "keypoints", label: "Key Points" },
  { id: "timeline", label: "Related & Timeline" },
  { id: "reaction", label: "Public Reaction" },
];

/* ─── Sentiment config ────────────────────────────────── */

const sentimentPill = {
  positive: "bg-[#22C55E]/20 border-[#22C55E]/30 text-[#22C55E]",
  negative: "bg-[#DC2626]/20 border-[#DC2626]/30 text-[#DC2626]",
  neutral: "bg-[#6B7280]/20 border-[#6B7280]/30 text-[#6B7280]",
};

const sentimentLabel = {
  positive: "Positive",
  negative: "Negative",
  neutral: "Neutral",
};

/* ═══════════════════════════════════════════════════════════
   ARTICLE DRILL-DOWN SCREEN
   ═══════════════════════════════════════════════════════════ */

export default function ArticleDrillDown() {
  const { selectedArticleId, articles, setScreen } = useKeywordStore();
  const { setArticleContext, clearArticleContext } = useChatStore();
  const [activeTab, setActiveTab] = useState<TabId>("keypoints");

  const article = useMemo(
    () => articles.find((a) => a.id === selectedArticleId),
    [articles, selectedArticleId]
  );

  // Update chat context when this article is displayed
  useEffect(() => {
    if (article) {
      setArticleContext(article);
    }
    return () => {
      // Don't clear context on unmount — FeedScreen will set its own
    };
  }, [article, setArticleContext]);

  // Derived data from article
  const categorizedEntities = useMemo(
    () => article ? getCategorizedEntities(article.entities) : { persons: [], organizations: [], locations: [], topics: [] },
    [article]
  );

  const summaryBullets = useMemo(
    () => article ? getSummaryBullets(article.summary) : [],
    [article]
  );

  const isTechnology = useMemo(
    () => article ? isTechnologyArticle(article) : false,
    [article]
  );

  if (!article) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <p className="text-[#9CA3AF]">Article not found</p>
      </div>
    );
  }

  const sentiment = article.sentiment.label;
  const sentimentScore = article.sentiment.score;
  const catConfig = CATEGORY_CONFIG[article.category] ?? CATEGORY_CONFIG.General;

  return (
    <motion.div
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -80 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative h-screen flex flex-col bg-[#F8F9FA] overflow-hidden"
    >
      {/* ── Hero section with category gradient ── */}
      <div className={`relative h-[28vh] shrink-0 bg-gradient-to-br ${catConfig.gradient}`}>
        {/* Decorative category icon */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[80px] opacity-10 select-none pointer-events-none">
          {catConfig.emoji}
        </div>

        {/* Back arrow */}
        <button
          onClick={() => setScreen("feed")}
          className="
            absolute top-4 left-4 z-20
            w-10 h-10 rounded-xl flex items-center justify-center
            bg-white/80 backdrop-blur-md border border-[#E5E7EB]
            text-[#374151] hover:text-[#1A1A2E] hover:border-[#D1D5DB]
            transition-colors duration-200
          "
          aria-label="Back to feed"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* VeeTrack logo */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-white/80 backdrop-blur-md rounded-full px-3 py-1.5 border border-[#E5E7EB]">
          <Zap className="w-3.5 h-3.5 text-[#E63946] fill-[#E63946]/15" />
          <span
            className="text-[11px] font-bold tracking-[0.12em] uppercase"
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            <span className="text-[#1A1A2E]">Vee</span>
            <span className="text-[#E63946]">Track</span>
          </span>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#F8F9FA] to-transparent" />
      </div>

      {/* ── Article header info ── */}
      <div className="shrink-0 px-4 pt-2 pb-3 flex flex-col gap-2.5 -mt-4 relative z-10">
        {/* Category badge + Timestamp */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{catConfig.emoji}</span>
            <span
              className={`text-[11px] font-bold tracking-wider uppercase ${catConfig.color}`}
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              {article.category}
            </span>
          </div>
          <span
            className="text-[#9CA3AF] text-xs"
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            {article.timestamp}
          </span>
        </div>

        {/* Source */}
        <div className="flex items-center gap-2">
          <div
            className={`w-5 h-5 rounded-md ${catConfig.bg} flex items-center justify-center text-[9px] ${catConfig.color} font-bold`}
          >
            {article.source[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="text-[#4B5563] text-xs font-medium">{article.source}</span>
        </div>

        {/* Headline */}
        <h1
          className="text-[#1A1A2E] text-[20px] sm:text-[22px] font-bold leading-tight line-clamp-3"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          {article.headline}
        </h1>

        {/* Sentiment + Trend + Risk row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-medium ${sentimentPill[sentiment]}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                sentiment === "positive"
                  ? "bg-[#22C55E]"
                  : sentiment === "negative"
                    ? "bg-[#DC2626]"
                    : "bg-[#6B7280]"
              }`}
            />
            {sentimentLabel[sentiment]} · {Math.round(sentimentScore * 100)}%
          </span>

          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-[#E63946]/60" />
            <span
              className="text-[10px] text-[#E63946] font-medium"
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              Trend: {article.trendScore}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span
              className="text-[10px] text-[#6B7280] font-medium"
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              Risk: {article.riskScore}
            </span>
          </div>

          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-[10px] text-[#E63946]/60 hover:text-[#E63946] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
              Source
            </a>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="shrink-0 border-b border-[#E5E7EB] bg-[#F8F9FA]">
        <div className="flex items-center relative">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 py-3 text-xs font-medium text-center transition-colors duration-200
                ${activeTab === tab.id ? "text-[#E63946]" : "text-[#9CA3AF] hover:text-[#4B5563]"}
              `}
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 h-0.5 bg-[#E63946] rounded-full"
                  style={{
                    left: `${(TABS.findIndex((t) => t.id === tab.id) / TABS.length) * 100}%`,
                    width: `${100 / TABS.length}%`,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "keypoints" && (
          <KeyPointsTab
            article={article}
            categorizedEntities={categorizedEntities}
            summaryBullets={summaryBullets}
          />
        )}
        {activeTab === "timeline" && (
          <RelatedTimelineTab article={article} />
        )}
        {activeTab === "reaction" && (
          <PublicReactionTab article={article} isTechnology={isTechnology} />
        )}
      </div>

      {/* Article chat (floating bubble + panel) */}
      <ChatBubble />
      <ArticleChat />
    </motion.div>
  );
}
