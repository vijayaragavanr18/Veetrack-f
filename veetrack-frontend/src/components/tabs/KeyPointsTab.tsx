"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Eye, CheckCircle, ExternalLink } from "lucide-react";
import { Article, getEntityContext } from "@/lib/data/articles";

/* ─── Types ───────────────────────────────────────────── */

interface CategorizedEntities {
  persons: string[];
  organizations: string[];
  locations: string[];
  topics: string[];
}

interface KeyPointsTabProps {
  article: Article;
  categorizedEntities: CategorizedEntities;
  summaryBullets: string[];
}

/* ─── Helpers ─────────────────────────────────────────── */

function getArticleType(timestamp: string | undefined | null): { label: string; color: string } {
  if (!timestamp) return { label: "📊 Analysis", color: "text-[#6B7280]" };
  const lower = timestamp.toLowerCase();
  if (lower.includes("just now") || lower.includes("min ago")) {
    return { label: "🔴 Breaking", color: "text-[#EF4444]" };
  }
  const hourMatch = lower.match(/(\d+)\s*hour/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    if (hours < 2) return { label: "🔴 Breaking", color: "text-[#EF4444]" };
    if (hours < 12) return { label: "📡 Developing", color: "text-[#F59E0B]" };
  }
  return { label: "📊 Analysis", color: "text-[#6B7280]" };
}

function getSuggestedAction(
  riskScore: number,
  sentiment: Article["sentiment"]["label"]
): { icon: React.ReactNode; text: string; borderColor: string } {
  if (riskScore > 70 && sentiment === "negative") {
    return {
      icon: <Zap className="w-4 h-4 text-[#EF4444]" />,
      text: "URGENT: Monitor closely. Prepare PR response within 2 hours.",
      borderColor: "border-l-[#EF4444]",
    };
  }
  if (riskScore >= 40 && riskScore <= 70 && sentiment === "negative") {
    return {
      icon: <Eye className="w-4 h-4 text-[#F59E0B]" />,
      text: "FLAG: Track if volume increases in next 6 hours.",
      borderColor: "border-l-[#F59E0B]",
    };
  }
  if (riskScore >= 40 && riskScore <= 70 && sentiment === "positive") {
    return {
      icon: <Eye className="w-4 h-4 text-[#F59E0B]" />,
      text: "OPPORTUNITY: Amplify positive coverage.",
      borderColor: "border-l-[#F59E0B]",
    };
  }
  return {
    icon: <CheckCircle className="w-4 h-4 text-[#22C55E]" />,
    text: "NOTE: Archive for trend tracking. No immediate action required.",
    borderColor: "border-l-[#22C55E]",
  };
}

/* ─── Sentiment Meter ─────────────────────────────────── */

function SentimentMeter({ score, sentiment }: { score: number; sentiment: Article["sentiment"]["label"] }) {
  const pct = Math.round(score * 100);
  const label = sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
  const thumbColor =
    sentiment === "positive"
      ? "bg-[#22C55E]"
      : sentiment === "negative"
        ? "bg-[#EF4444]"
        : "bg-[#6B7280]";

  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-xs text-[#4B5563]"
        style={{ fontFamily: "var(--font-poppins), monospace" }}
      >
        Sentiment: {label} ({pct}%)
      </span>
      <div className="relative h-2.5 rounded-full overflow-hidden bg-gradient-to-r from-[#EF4444] via-[#6B7280] to-[#22C55E]">
        <motion.div
          className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ${thumbColor} border-2 border-[#F8F9FA] shadow-lg`}
          initial={{ left: 0 }}
          animate={{ left: `${pct}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
          style={{ transform: "translate(-50%, -50%)" }}
        />
      </div>
    </div>
  );
}

/* ─── Entity Category Section ─────────────────────────── */

function EntityCategory({
  label,
  entities,
  onEntityClick,
}: {
  label: string;
  entities: string[];
  onEntityClick: (entity: string) => void;
}) {
  if (entities.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-[10px] text-[#9CA3AF] tracking-widest uppercase"
        style={{ fontFamily: "var(--font-poppins), monospace" }}
      >
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {entities.map((entity) => (
          <button
            key={entity}
            onClick={() => onEntityClick(entity)}
            className="
              px-3 py-1.5 rounded-full text-xs
              bg-[#F1F5F9] border border-[#E5E7EB]
              text-[#E63946] hover:bg-[#E63946]/8 hover:border-[#E63946]/30
              transition-colors duration-150 cursor-pointer
            "
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            {entity}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Wikipedia Context Card ──────────────────────────── */

function WikiContextCard({ entity }: { entity: string }) {
  const ctx = getEntityContext(entity);
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4 flex flex-col gap-2">
        <p className="text-[#374151] text-xs leading-relaxed">{ctx.text}</p>
        <div className="flex items-center gap-3">
          <a
            href={ctx.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-[#E63946] hover:underline"
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            <ExternalLink className="w-3 h-3" />
            Wikipedia
          </a>
          <a
            href={`https://www.wikidata.org/w/index.php?search=${encodeURIComponent(entity)}&ns0=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-[#006699] hover:underline"
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            <ExternalLink className="w-3 h-3" />
            Wikidata
          </a>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN KEYPOINTS TAB
   ═══════════════════════════════════════════════════════════ */

export default function KeyPointsTab({ article, categorizedEntities, summaryBullets }: KeyPointsTabProps) {
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);
  const articleType = getArticleType(article.timestamp);
  const action = getSuggestedAction(article.riskScore, article.sentiment.label);

  const handleEntityClick = (entity: string) => {
    setExpandedEntity((prev) => (prev === entity ? null : entity));
  };

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-24 overflow-y-auto max-h-[calc(100vh-30vh-120px)]">
      {/* Article Type Badge */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] text-[#9CA3AF] tracking-widest uppercase"
          style={{ fontFamily: "var(--font-poppins), monospace" }}
        >
          Key Points
        </span>
        <span
          className={`text-xs font-medium ${articleType.color}`}
          style={{ fontFamily: "var(--font-poppins), monospace" }}
        >
          {articleType.label}
        </span>
      </div>

      {/* 1. Summary Bullets */}
      <div className="flex flex-col gap-2.5">
        {summaryBullets.map((bullet, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className="flex items-start gap-2.5"
          >
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#E63946] shrink-0" />
            <span
              className="text-[#1A1A2E] text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {bullet}
            </span>
          </motion.div>
        ))}
      </div>

      {/* 2. Sentiment Meter */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4 flex flex-col gap-3">
        <SentimentMeter score={article.sentiment.score} sentiment={article.sentiment.label} />
      </div>

      {/* 3. Named Entities */}
      <div className="flex flex-col gap-3">
        <span
          className="text-[10px] text-[#9CA3AF] tracking-widest uppercase"
          style={{ fontFamily: "var(--font-poppins), monospace" }}
        >
          Named Entities
        </span>

        <EntityCategory label="Person" entities={categorizedEntities.persons} onEntityClick={handleEntityClick} />
        <EntityCategory label="Organization" entities={categorizedEntities.organizations} onEntityClick={handleEntityClick} />
        <EntityCategory label="Location" entities={categorizedEntities.locations} onEntityClick={handleEntityClick} />
        <EntityCategory label="Topic" entities={categorizedEntities.topics} onEntityClick={handleEntityClick} />

        <AnimatePresence>
          {expandedEntity && <WikiContextCard entity={expandedEntity} />}
        </AnimatePresence>
      </div>

      {/* 4. Why It Matters */}
      {article.whyItMatters && (
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4">
          <span
            className="text-[10px] text-[#9CA3AF] tracking-widest uppercase block mb-2"
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            Why It Matters
          </span>
          <p className="text-[#1A1A2E] text-sm leading-relaxed" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
            {article.whyItMatters}
          </p>
        </div>
      )}

      {/* 5. Suggested Action Box */}
      <div className={`bg-[#FFFFFF] border border-[#E5E7EB] border-l-4 ${action.borderColor} rounded-xl p-4 flex items-start gap-3`}>
        <div className="mt-0.5 shrink-0">{action.icon}</div>
        <div className="flex flex-col gap-1">
          <span
            className="text-xs text-[#6B7280] tracking-wider uppercase"
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            Suggested Action
          </span>
          <span
            className="text-[#1A1A2E] text-sm leading-relaxed"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            {article.suggestedAction || action.text}
          </span>
        </div>
      </div>
    </div>
  );
}
