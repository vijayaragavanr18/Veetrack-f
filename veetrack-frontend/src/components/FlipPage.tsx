"use client";

import { useMemo, useCallback } from "react";
import {
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import {
  Article,
  CATEGORY_CONFIG,
  generateSparkline,
  getEntityTexts,
} from "@/lib/data/articles";

/* ─── Helpers ─────────────────────────────────────────── */

const sentimentDot = {
  positive: "bg-[#22C55E]",
  negative: "bg-[#EF4444]",
  neutral: "bg-[#6B7280]",
} as const;

const sentimentText = {
  positive: "text-[#22C55E]",
  negative: "text-[#EF4444]",
  neutral: "text-[#6B7280]",
} as const;

const sentimentLabel = {
  positive: "Positive",
  negative: "Negative",
  neutral: "Neutral",
} as const;

function riskColor(score: number): string {
  if (score < 35) return "text-[#22C55E]";
  if (score < 65) return "text-[#F59E0B]";
  return "text-[#EF4444]";
}

function riskBg(score: number): string {
  if (score < 35) return "bg-[#22C55E]";
  if (score < 65) return "bg-[#F59E0B]";
  return "bg-[#EF4444]";
}

/* ─── Sparkline SVG ──────────────────────────────────── */

function Sparkline({ data, color = "#E63946" }: { data: number[]; color?: string }) {
  const w = 56;
  const h = 20;
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (v / max) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   FLIPBOARD-STYLE ARTICLE PAGE (Content Only)
   
   Pure content component — no animation logic.
   Animation is handled by FlipContainer.
   
   ┌────────────────────────────────────┐
   │  ═══ accent bar ═══               │
   │                                    │
   │  🏛️ POLITICS          5 min ago   │
   │                                    │
   │  Big Bold Headline That Spans      │
   │  Two to Three Lines Maximum        │
   │                                    │
   │  Summary text describing the       │
   │  article in 3-4 lines...           │
   │                                    │
   │  🟢 Positive   📈 62   ⚠️ Risk 45 │
   │  ████████░░░░                      │
   │                                    │
   │  [Entity] [Entity] [Entity]        │
   │                                    │
   │  Source Name                        │
   │  [Read More →] [🔗]               │
   │                                    │
   │        ── swipe up for next ──     │
   └────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════ */

interface FlipPageProps {
  article: Article;
  onNavigate: (id: string) => void;
}

export default function FlipPage({ article, onNavigate }: FlipPageProps) {
  const sparkline = useMemo(() => generateSparkline(article.trendScore), [article.trendScore]);
  const catConfig = CATEGORY_CONFIG[article.category] ?? CATEGORY_CONFIG.General;
  const entityTexts = getEntityTexts(article.entities);

  const handleReadMore = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(article.id);
  }, [onNavigate, article.id]);

  const handleExternalLink = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (article.url) {
      window.open(article.url, "_blank", "noopener,noreferrer");
    }
  }, [article.url]);

  return (
    <div
      className={`
        absolute inset-0 flex flex-col
        rounded-2xl overflow-hidden
        bg-gradient-to-br ${catConfig.gradient}
        border ${catConfig.border}
      `}
    >
      {/* Decorative large emoji watermark */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[180px] opacity-[0.04] select-none pointer-events-none">
        {catConfig.emoji}
      </div>

      {/* Category-colored top accent bar */}
      <div className={`shrink-0 h-1.5 w-full ${catConfig.bg.replace("/10", "/50")}`} />

      {/* Content area */}
      <div className="flex-1 flex flex-col px-5 pt-5 pb-4 overflow-y-auto overscroll-contain">
        {/* Row 1: Category + Time */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{catConfig.emoji}</span>
            <span
              className={`text-[12px] font-bold tracking-wider uppercase ${catConfig.color}`}
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              {article.category}
            </span>
          </div>
          <span
            className="text-[11px] text-[#9CA3AF]"
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            {article.timestamp}
          </span>
        </div>

        {/* Row 2: Headline — large, bold */}
        <h2
          className="text-[#1A1A2E] text-[22px] sm:text-[26px] font-bold leading-tight mt-3 shrink-0"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          {article.headline}
        </h2>

        {/* Row 3: Source */}
        <div className="flex items-center gap-2 mt-2.5 shrink-0">
          <div
            className={`w-6 h-6 rounded-lg ${catConfig.bg} flex items-center justify-center text-[10px] ${catConfig.color} font-bold`}
          >
            {article.source[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="text-[#6B7280] text-[12px] font-medium">
            {article.source}
          </span>
          <span className="text-[#D1D5DB]">·</span>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D1D5DB] hover:text-[#4B5563] transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#F1F5F9] my-3 shrink-0" />

        {/* Row 4: Summary */}
        <p
          className="text-[#4B5563] text-[14px] leading-relaxed shrink-0"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          {article.summary || article.headline}
        </p>

        {/* Row 5: Why It Matters (if available) */}
        {article.whyItMatters && (
          <div className="mt-3 shrink-0 px-3 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB]">
            <p
              className="text-[10px] font-bold tracking-wider uppercase text-[#E63946]/70 mb-1"
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              Why It Matters
            </p>
            <p className="text-[#9CA3AF] text-[12px] leading-relaxed">
              {article.whyItMatters}
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-[#F1F5F9] my-3 shrink-0" />

        {/* Row 6: Metrics */}
        <div className="flex items-center gap-4 flex-wrap shrink-0">
          {/* Sentiment */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${sentimentDot[article.sentiment.label]}`} />
            <span className={`text-[12px] font-medium ${sentimentText[article.sentiment.label]}`}>
              {sentimentLabel[article.sentiment.label]}
            </span>
          </div>

          {/* Trend */}
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#E63946]/60" />
            <span
              className="text-[12px] text-[#E63946] font-medium"
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              {article.trendScore}
            </span>
            <Sparkline data={sparkline} />
          </div>

          {/* Risk */}
          <div className="flex items-center gap-1.5">
            <AlertTriangle className={`w-4 h-4 ${riskColor(article.riskScore)} opacity-60`} />
            <span
              className={`text-[12px] font-medium ${riskColor(article.riskScore)}`}
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              Risk {article.riskScore}
            </span>
          </div>
        </div>

        {/* Risk bar */}
        <div className="h-1 w-full rounded-full bg-[#F1F5F9] overflow-hidden mt-2 shrink-0">
          <div
            className={`h-full rounded-full ${riskBg(article.riskScore)}`}
            style={{ width: `${article.riskScore}%` }}
          />
        </div>

        {/* Row 7: Entity chips */}
        {entityTexts.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap shrink-0">
            {entityTexts.slice(0, 4).map((entity) => (
              <span
                key={entity}
                className={`
                  px-2.5 py-1 rounded-full text-[10px] font-medium
                  ${catConfig.bg} ${catConfig.color} ${catConfig.border} border
                `}
              >
                {entity}
              </span>
            ))}
          </div>
        )}

        {/* Row 8: Action buttons */}
        <div className="flex items-center gap-3 mt-4 shrink-0">
          <button
            onClick={handleReadMore}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl
              ${catConfig.bg} ${catConfig.color} border ${catConfig.border}
              text-[13px] font-semibold
              hover:brightness-125 active:scale-95
              transition-all duration-200
            `}
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            Read Full Story
            <ArrowUpRight className="w-4 h-4" />
          </button>

          {article.url && (
            <button
              onClick={handleExternalLink}
              className="
                flex items-center gap-1.5 px-4 py-2.5 rounded-xl
                bg-[#F1F5F9] border border-[#E5E7EB]
                text-[#6B7280] text-[12px] font-medium
                hover:text-[#1A1A2E] hover:border-[#D1D5DB]
                active:scale-95 transition-all duration-200
              "
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Source
            </button>
          )}
        </div>

        {/* Suggested action (if high risk) */}
        {article.riskScore > 50 && article.suggestedAction && (
          <div className="mt-3 shrink-0 px-3 py-2 rounded-lg bg-[#DC2626]/5 border border-[#DC2626]/10">
            <p className="text-[#DC2626]/70 text-[10px] font-semibold uppercase tracking-wider"
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              Suggested Action
            </p>
            <p className="text-[#DC2626]/50 text-[11px] mt-0.5">
              {article.suggestedAction}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
