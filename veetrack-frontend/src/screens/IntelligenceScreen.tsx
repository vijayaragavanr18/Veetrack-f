"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Zap,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Siren,
  Building2,
  Swords,
  Globe2,
  FileText,
  Download,
  FileDown,
  Quote,
  BarChart3,
} from "lucide-react";
import { useKeywordStore, type ScoredArticle, type IntelligenceReport } from "@/lib/stores/keyword-store";

/* ─── Helpers ─────────────────────────────────────────── */

const sentimentIcon = {
  positive: <TrendingUp className="w-3.5 h-3.5 text-[#22C55E]" />,
  negative: <TrendingDown className="w-3.5 h-3.5 text-[#DC2626]" />,
  neutral: <Minus className="w-3.5 h-3.5 text-[#6B7280]" />,
};

const sentimentPill = {
  positive: "bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]",
  negative: "bg-[#DC2626]/10 border-[#DC2626]/20 text-[#DC2626]",
  neutral: "bg-[#6B7280]/10 border-[#6B7280]/20 text-[#6B7280]",
};

const sentimentLabel = {
  positive: "Positive",
  negative: "Negative",
  neutral: "Neutral",
};

const sectionIcon = {
  company: <Building2 className="w-4 h-4 text-[#E63946]" />,
  competition: <Swords className="w-4 h-4 text-[#DC2626]" />,
  industry: <Globe2 className="w-4 h-4 text-[#D97706]" />,
};

const sectionLabel = {
  company: "Company",
  competition: "Competition",
  industry: "Industry",
};

const tonePill = (tone: string) => {
  const map: Record<string, string> = {
    Critical: "bg-[#DC2626]/10 border-[#DC2626]/20 text-[#DC2626]",
    Alarming: "bg-[#DC2626]/10 border-[#DC2626]/20 text-[#DC2626]",
    Promotional: "bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]",
    Analytical: "bg-[#E63946]/8 border-[#E63946]/15 text-[#E63946]",
    Informative: "bg-[#6B7280]/10 border-[#6B7280]/20 text-[#6B7280]",
    Opinionated: "bg-[#9333EA]/10 border-[#9333EA]/20 text-[#9333EA]",
    Satirical: "bg-[#D97706]/10 border-[#D97706]/20 text-[#D97706]",
  };
  return map[tone] || "bg-[#F1F5F9] border-[#E5E7EB] text-[#6B7280]";
};

/* ─── Article Row ────────────────────────────────────── */

function ArticleRow({ article, rank }: { article: ScoredArticle; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden transition-colors duration-200 hover:border-[#D1D5DB]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
      >
        {/* Rank */}
        <span
          className="shrink-0 w-7 h-7 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[11px] font-bold text-[#9CA3AF]"
          style={{ fontFamily: "var(--font-poppins), monospace" }}
        >
          {rank}
        </span>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {/* Section badge */}
            <span className="flex items-center gap-1 text-[10px] text-[#9CA3AF]">
              {sectionIcon[article.section]}
              {sectionLabel[article.section]}
            </span>
            <span className="text-[#D1D5DB]">·</span>
            <span className="text-[10px] text-[#D1D5DB]">{article.publication}</span>
            {article.isPriority && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20">
                PRIORITY
              </span>
            )}
            {/* Tone badge */}
            {article.tone && (
              <span className={`px-1.5 py-0.5 rounded border text-[9px] font-medium ${tonePill(article.tone)}`}>
                {article.tone}
              </span>
            )}
          </div>
          <h3
            className="text-[#1A1A2E] text-[13px] font-medium leading-snug line-clamp-2"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            {article.headline}
          </h3>
          {/* Snippet preview (collapsed) */}
          {!expanded && article.snippet && (
            <p className="text-[#D1D5DB] text-[11px] mt-1 line-clamp-1">{article.snippet}</p>
          )}
        </div>

        {/* Right: Score + Sentiment */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <span
              className={`text-[11px] font-bold ${
                article.relevanceScore >= 70
                  ? "text-[#E63946]"
                  : article.relevanceScore >= 50
                    ? "text-[#D97706]"
                    : "text-[#9CA3AF]"
              }`}
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              {article.relevanceScore}
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-medium ${sentimentPill[article.sentiment]}`}
          >
            {sentimentIcon[article.sentiment]}
            {sentimentLabel[article.sentiment]}
          </span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#D1D5DB]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#D1D5DB]" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="border-t border-[#E5E7EB] px-4 py-3 bg-[#F1F5F9]"
        >
          {/* Snippet */}
          {article.snippet && (
            <p className="text-[#9CA3AF] text-[12px] leading-relaxed mb-2">{article.snippet}</p>
          )}

          {/* Sentiment reason */}
          {article.sentimentReason && (
            <div className="flex items-start gap-1.5 mb-2">
              <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider shrink-0"
                style={{ fontFamily: "var(--font-poppins), monospace" }}
              >
                Why:
              </span>
              <span className="text-[#6B7280] text-[11px]">{article.sentimentReason}</span>
            </div>
          )}

          {/* Relevance explanation */}
          {article.relevanceExplanation && (
            <div className="flex items-start gap-1.5 mb-2 px-2.5 py-2 rounded-lg bg-[#D97706]/5 border border-[#D97706]/10">
              <span className="text-[10px] text-[#D97706]/60 uppercase tracking-wider shrink-0"
                style={{ fontFamily: "var(--font-poppins), monospace" }}
              >
                Score:
              </span>
              <span className="text-[#D97706]/70 text-[11px]">{article.relevanceExplanation}</span>
            </div>
          )}

          {/* Business Impact */}
          {article.businessImpact && (
            <div className="flex items-start gap-1.5 mb-2 px-2.5 py-2 rounded-lg bg-[#E63946]/5 border border-[#E63946]/10">
              <span className="text-[10px] text-[#E63946]/60 uppercase tracking-wider shrink-0"
                style={{ fontFamily: "var(--font-poppins), monospace" }}
              >
                Impact:
              </span>
              <span className="text-[#E63946]/70 text-[11px]">{article.businessImpact}</span>
            </div>
          )}

          {/* Key Quote */}
          {article.keyQuote && article.keyQuote !== "N/A" && (
            <div className="flex items-start gap-1.5 mb-2 px-2.5 py-2 rounded-lg bg-[#F8F9FA] border border-[#E5E7EB]">
              <Quote className="w-3 h-3 text-[#D1D5DB] shrink-0 mt-0.5" />
              <span className="text-[#9CA3AF] text-[11px] italic">{article.keyQuote}</span>
            </div>
          )}

          {/* Entities */}
          {(article.entities.people.length > 0 || article.entities.organizations.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {article.entities.people.map((p) => (
                <span key={p} className="px-1.5 py-0.5 rounded-full text-[9px] bg-[#F1F5F9] border border-[#E5E7EB] text-[#4B5563]">
                  {p}
                </span>
              ))}
              {article.entities.organizations.map((o) => (
                <span key={o} className="px-1.5 py-0.5 rounded-full text-[9px] bg-[#F1F5F9] border border-[#E5E7EB] text-[#4B5563]">
                  {o}
                </span>
              ))}
              {article.entities.locations.map((l) => (
                <span key={l} className="px-1.5 py-0.5 rounded-full text-[9px] bg-[#F1F5F9] border border-[#E5E7EB] text-[#4B5563]">
                  {l}
                </span>
              ))}
            </div>
          )}

          {/* Sarcasm flag */}
          {article.sarcasmFlag && (
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3 h-3 text-[#D97706]" />
              <span className="text-[10px] text-[#D97706] font-medium">
                Sarcasm detected{article.sarcasmReason && article.sarcasmReason !== "N/A" ? `: ${article.sarcasmReason}` : ""}
              </span>
            </div>
          )}

          {/* Confidence indicator */}
          {article.sentimentConfidence !== undefined && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider"
                style={{ fontFamily: "var(--font-poppins), monospace" }}
              >
                Confidence
              </span>
              <div className="flex-1 h-1 rounded-full bg-[#E5E7EB] overflow-hidden max-w-[80px]">
                <div
                  className={`h-full rounded-full ${
                    article.sentimentConfidence >= 0.7 ? "bg-[#22C55E]" :
                    article.sentimentConfidence >= 0.4 ? "bg-[#D97706]" : "bg-[#DC2626]"
                  }`}
                  style={{ width: `${article.sentimentConfidence * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-[#9CA3AF]"
                style={{ fontFamily: "var(--font-poppins), monospace" }}
              >
                {Math.round(article.sentimentConfidence * 100)}%
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-[#1D4ED8]/60 hover:text-[#1D4ED8] transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Read article
              </a>
            )}
            <span className="text-[10px] text-[#D1D5DB]">{article.date}</span>
            <span className="text-[10px] text-[#D1D5DB]">{article.edition}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Section Block ──────────────────────────────────── */

function SectionBlock({
  title,
  icon,
  articles,
  emptyMessage,
}: {
  title: string;
  icon: React.ReactNode;
  articles: ScoredArticle[];
  emptyMessage: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2
            className="text-[#1A1A2E] text-[14px] font-bold uppercase tracking-wider"
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            {title}
          </h2>
          <span className="text-[11px] text-[#D1D5DB] font-medium">({articles.length})</span>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#6B7280] transition-colors" />
        ) : (
          <ChevronUp className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#6B7280] transition-colors" />
        )}
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-2">
          {articles.length > 0 ? (
            articles.map((article, idx) => (
              <ArticleRow key={article.url + idx} article={article} rank={idx + 1} />
            ))
          ) : (
            <div className="px-4 py-6 rounded-xl border border-[#E5E7EB] text-center">
              <p className="text-[#D1D5DB] text-[12px]">{emptyMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Sentiment Breakdown ─────────────────────────────── */

function SentimentBreakdown({ stats }: { stats: IntelligenceReport["stats"] }) {
  const total = stats.positiveCount + stats.negativeCount + stats.neutralCount;
  if (total === 0) return null;

  const posW = (stats.positiveCount / total) * 100;
  const negW = (stats.negativeCount / total) * 100;
  const neuW = (stats.neutralCount / total) * 100;

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-[#E5E7EB] flex">
        <div className="h-full bg-[#22C55E] transition-all duration-500" style={{ width: `${posW}%` }} />
        <div className="h-full bg-[#DC2626] transition-all duration-500" style={{ width: `${negW}%` }} />
        <div className="h-full bg-[#6B7280] transition-all duration-500" style={{ width: `${neuW}%` }} />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="flex items-center gap-1 text-[10px] text-[#22C55E]/70">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          {stats.positiveCount} pos
        </span>
        <span className="flex items-center gap-1 text-[10px] text-[#DC2626]/70">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
          {stats.negativeCount} neg
        </span>
        <span className="flex items-center gap-1 text-[10px] text-[#6B7280]/70">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
          {stats.neutralCount} neu
        </span>
      </div>
    </div>
  );
}

/* ─── Loading Agent Animation ────────────────────────── */

function AgentLoader() {
  const agents = [
    { name: "WATCHER", desc: "Searching web for recent news (5 days)...", icon: <Globe2 className="w-5 h-5" /> },
    { name: "CONTEXT", desc: "Analyzing sentiment, tone & entities...", icon: <FileText className="w-5 h-5" /> },
    { name: "RELEVANCE", desc: "Scoring articles with explainability...", icon: <TrendingUp className="w-5 h-5" /> },
    { name: "ALERT", desc: "Generating intelligence report...", icon: <Siren className="w-5 h-5" /> },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
      <div className="relative">
        <Loader2 className="w-16 h-16 text-[#E63946] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap className="w-6 h-6 text-[#E63946]" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <h2
          className="text-[#1A1A2E] text-lg font-bold"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          Running 4-Agent Intelligence Pipeline
        </h2>
        <p
          className="text-[#9CA3AF] text-[12px]"
          style={{ fontFamily: "var(--font-poppins), monospace" }}
        >
          This may take 30-90 seconds
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-md">
        {agents.map((agent, idx) => (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.3, duration: 0.4 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#FFFFFF] border border-[#E5E7EB]"
          >
            <div className="text-[#E63946]/60">{agent.icon}</div>
            <div className="flex-1">
              <p
                className="text-[#4B5563] text-[12px] font-bold tracking-wider"
                style={{ fontFamily: "var(--font-poppins), monospace" }}
              >
                AGENT {idx + 1} — {agent.name}
              </p>
              <p className="text-[#9CA3AF] text-[11px]">{agent.desc}</p>
            </div>
            <motion.div
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: idx * 0.4 }}
              className="w-2 h-2 rounded-full bg-[#E63946]"
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   INTELLIGENCE SCREEN
   ═══════════════════════════════════════════════════════════ */

export default function IntelligenceScreen() {
  const {
    intelligenceReport,
    isIntelligenceLoading,
    intelligenceError,
    setScreen,
    runIntelligencePipeline,
  } = useKeywordStore();

  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const handleRun = useCallback(() => {
    runIntelligencePipeline("ZEE5");
  }, [runIntelligencePipeline]);

  const handleBack = useCallback(() => {
    setScreen("feed");
  }, [setScreen]);

  const handleDownload = useCallback(async (format: "pdf" | "docx") => {
    if (!intelligenceReport) return;

    setIsDownloading(format);
    try {
      const res = await fetch(`/api/intelligence/download-${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intelligenceReport),
      });

      if (!res.ok) {
        throw new Error(`Download failed: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VeeTrack-Intelligence-Report.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setIsDownloading(null);
    }
  }, [intelligenceReport]);

  const report: IntelligenceReport | null = intelligenceReport;

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative min-h-screen flex flex-col bg-[#F8F9FA] overflow-hidden"
    >
      {/* ── Sticky header ── */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-[#F8F9FA]/90 backdrop-blur-xl border-b border-[#E5E7EB]/50 z-30">
        <button
          onClick={handleBack}
          className="
            w-9 h-9 rounded-xl flex items-center justify-center
            bg-[#FFFFFF] border border-[#E5E7EB]
            text-[#6B7280] hover:text-[#1A1A2E] hover:border-[#E63946]/30
            transition-colors duration-200
          "
          aria-label="Back to feed"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-[#E63946] fill-[#E63946]/20" />
          <h1
            className="text-sm font-bold tracking-[0.15em] uppercase"
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            <span className="text-[#1A1A2E]">Vee</span>
            <span className="text-[#E63946]">Track</span>
          </h1>
        </div>

        <span
          className="text-[11px] text-[#9CA3AF] ml-2"
          style={{ fontFamily: "var(--font-poppins), monospace" }}
        >
          Intelligence
        </span>

        {/* Download buttons (visible when report exists) */}
        {!isIntelligenceLoading && report && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => handleDownload("pdf")}
              disabled={isDownloading === "pdf"}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                bg-[#DC2626]/10 border border-[#DC2626]/20 text-[#DC2626]
                text-[11px] font-semibold
                hover:bg-[#DC2626]/15 transition-colors duration-200
                disabled:opacity-40 disabled:cursor-not-allowed
              "
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              {isDownloading === "pdf" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <FileDown className="w-3 h-3" />
              )}
              PDF
            </button>
            <button
              onClick={() => handleDownload("docx")}
              disabled={isDownloading === "docx"}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                bg-[#E63946]/10 border border-[#E63946]/15 text-[#E63946]
                text-[11px] font-semibold
                hover:bg-[#E63946]/15 transition-colors duration-200
                disabled:opacity-40 disabled:cursor-not-allowed
              "
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              {isDownloading === "docx" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              DOCX
            </button>
            <button
              onClick={handleRun}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                bg-[#F1F5F9] border border-[#E5E7EB] text-[#4B5563]
                text-[11px] font-semibold
                hover:text-[#1A1A2E] hover:border-[#D1D5DB]
                transition-colors duration-200
              "
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        )}

        {!isIntelligenceLoading && !report && (
          <button
            onClick={handleRun}
            className="
              ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl
              bg-[#E63946]/10 border border-[#E63946]/15 text-[#E63946]
              text-[11px] font-semibold
              hover:bg-[#E63946]/15 transition-colors duration-200
            "
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            <RefreshCw className="w-3 h-3" />
            Run Pipeline
          </button>
        )}
      </header>

      {/* ── Main content ── */}
      {isIntelligenceLoading ? (
        <AgentLoader />
      ) : report ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-5">
            {/* Report header */}
            <div className="mb-6 pb-5 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-5 h-5 text-[#E63946]" />
                <h2
                  className="text-[#1A1A2E] text-[18px] font-bold tracking-wide"
                  style={{ fontFamily: "var(--font-poppins), monospace" }}
                >
                  DAILY INTELLIGENCE REPORT
                </h2>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[11px] text-[#9CA3AF]">Client: {report.clientName || "ZEE5 / Vee Technologies"}</span>
                <span className="text-[#D1D5DB]">·</span>
                <span className="text-[11px] text-[#9CA3AF]">{report.date}</span>
                <span className="text-[#D1D5DB]">·</span>
                <span className="text-[11px] text-[#9CA3AF]">{report.generatedAt}</span>
              </div>

              {/* Stats bar */}
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F1F5F9] border border-[#E5E7EB]">
                  <FileText className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span className="text-[11px] text-[#4B5563] font-medium">
                    {report.stats.totalFound} articles
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DC2626]/5 border border-[#DC2626]/10">
                  <Siren className="w-3.5 h-3.5 text-[#DC2626]/50" />
                  <span className="text-[11px] text-[#DC2626]/70 font-medium">
                    {report.stats.critical} critical
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D97706]/5 border border-[#D97706]/10">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]/50" />
                  <span className="text-[11px] text-[#D97706]/70 font-medium">
                    {report.stats.priority} priority
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E63946]/5 border border-[#E63946]/10">
                  <BarChart3 className="w-3.5 h-3.5 text-[#E63946]/50" />
                  <span className="text-[11px] text-[#E63946]/70 font-medium">
                    {report.stats.sourcesCount} sources
                  </span>
                </div>
              </div>

              {/* Sentiment breakdown */}
              <div className="mt-3">
                <SentimentBreakdown stats={report.stats} />
              </div>
            </div>

            {/* 🔴 CRITICAL ALERTS */}
            <SectionBlock
              title="Critical Alerts"
              icon={<Siren className="w-5 h-5 text-[#DC2626]" />}
              articles={report.criticalAlerts}
              emptyMessage="No critical alerts today"
            />

            {/* 📊 PRIORITY ITEMS */}
            <SectionBlock
              title="Priority Items"
              icon={<AlertTriangle className="w-5 h-5 text-[#D97706]" />}
              articles={report.priorityItems}
              emptyMessage="No priority items today"
            />

            {/* 📰 COMPANY NEWS */}
            <SectionBlock
              title="Company News — ZEE5"
              icon={<Building2 className="w-5 h-5 text-[#E63946]" />}
              articles={report.companyNews}
              emptyMessage="No ZEE5 coverage in the past 5 days"
            />

            {/* 📰 COMPETITION NEWS */}
            <SectionBlock
              title="Competition News"
              icon={<Swords className="w-5 h-5 text-[#DC2626]" />}
              articles={report.competitionNews}
              emptyMessage="No competitor coverage in the past 5 days"
            />

            {/* 📰 INDUSTRY NEWS */}
            <SectionBlock
              title="Industry News"
              icon={<Globe2 className="w-5 h-5 text-[#D97706]" />}
              articles={report.industryNews}
              emptyMessage="No industry coverage in the past 5 days"
            />

            {/* ── Executive Brief ── */}
            <div className="mt-2 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-[#E63946]" />
                <h2
                  className="text-[#1A1A2E] text-[14px] font-bold uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-poppins), monospace" }}
                >
                  Executive Brief
                </h2>
              </div>

              <div className="flex flex-col gap-3">
                {/* What happened */}
                <div className="px-4 py-3 rounded-xl bg-[#FFFFFF] border border-[#E5E7EB]">
                  <p
                    className="text-[10px] font-bold tracking-wider uppercase text-[#9CA3AF] mb-1.5"
                    style={{ fontFamily: "var(--font-poppins), monospace" }}
                  >
                    What happened
                  </p>
                  <p className="text-[#4B5563] text-[13px] leading-relaxed">
                    {report.executiveBrief.happened}
                  </p>
                </div>

                {/* Why it matters */}
                <div className="px-4 py-3 rounded-xl bg-[#E63946]/5 border border-[#E63946]/10">
                  <p
                    className="text-[10px] font-bold tracking-wider uppercase text-[#E63946]/50 mb-1.5"
                    style={{ fontFamily: "var(--font-poppins), monospace" }}
                  >
                    Why it matters for ZEE5
                  </p>
                  <p className="text-[#E63946]/70 text-[13px] leading-relaxed">
                    {report.executiveBrief.whyItMatters}
                  </p>
                </div>

                {/* Recommended action */}
                <div className="px-4 py-3 rounded-xl bg-[#22C55E]/5 border border-[#22C55E]/10">
                  <p
                    className="text-[10px] font-bold tracking-wider uppercase text-[#22C55E]/50 mb-1.5"
                    style={{ fontFamily: "var(--font-poppins), monospace" }}
                  >
                    Recommended action
                  </p>
                  <p className="text-[#22C55E]/70 text-[13px] leading-relaxed">
                    {report.executiveBrief.recommendedAction}
                  </p>
                </div>

                {/* Trend outlook */}
                {report.executiveBrief.trendOutlook && (
                  <div className="px-4 py-3 rounded-xl bg-[#D97706]/5 border border-[#D97706]/10">
                    <p
                      className="text-[10px] font-bold tracking-wider uppercase text-[#D97706]/50 mb-1.5"
                      style={{ fontFamily: "var(--font-poppins), monospace" }}
                    >
                      Trend outlook
                    </p>
                    <p className="text-[#D97706]/70 text-[13px] leading-relaxed">
                      {report.executiveBrief.trendOutlook}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pb-6 text-center">
              <p className="text-[10px] text-[#E5E7EB] uppercase tracking-widest"
                style={{ fontFamily: "var(--font-poppins), monospace" }}
              >
                VeeTrack AI · Powered by 4-Agent Intelligence Pipeline · 5-Day Coverage Window
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ── Initial state: no report yet ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          <div className="w-20 h-20 rounded-2xl bg-[#FFFFFF] border border-[#E5E7EB] flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-[#E63946]/40" />
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <h2
              className="text-[#4B5563] text-lg font-bold"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              Daily Intelligence Report
            </h2>
            <p
              className="text-[#9CA3AF] text-[13px] max-w-sm"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              Run the 4-agent pipeline to search recent news, analyze sentiment, score relevance, and generate an intelligence report for ZEE5.
            </p>
          </div>

          {/* Pipeline steps */}
          <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
            {[
              { label: "Watcher", desc: "5-day web search", icon: <Globe2 className="w-3.5 h-3.5" /> },
              { label: "Context", desc: "Sentiment & tone", icon: <FileText className="w-3.5 h-3.5" /> },
              { label: "Relevance", desc: "Score + explain", icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { label: "Alert", desc: "Report + brief", icon: <Siren className="w-3.5 h-3.5" /> },
            ].map((step, idx) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#E63946]/50">{step.icon}</span>
                    <span
                      className="text-[10px] text-[#6B7280] font-medium"
                      style={{ fontFamily: "var(--font-poppins), monospace" }}
                    >
                      {step.label}
                    </span>
                  </div>
                  <span className="text-[9px] text-[#9CA3AF]">{step.desc}</span>
                </div>
                {idx < 3 && <span className="text-[#D1D5DB]">→</span>}
              </div>
            ))}
          </div>

          {/* Run button */}
          <button
            onClick={handleRun}
            className="
              mt-4 flex items-center gap-2 px-6 py-3 rounded-xl
              bg-[#E63946]/10 border border-[#E63946]/15 text-[#E63946]
              text-[13px] font-semibold
              hover:bg-[#E63946]/15 hover:border-[#E63946]/30
              active:scale-95
              transition-all duration-200
            "
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            <Zap className="w-4 h-4" />
            Run Intelligence Pipeline
          </button>

          {intelligenceError && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 text-[#DC2626] text-[12px] max-w-md text-center">
              {intelligenceError}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
