"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Clock, Globe } from "lucide-react";
import { Article, generateSparkline } from "@/lib/data/articles";
import { useKeywordStore } from "@/lib/stores/keyword-store";

/* ─── Helpers ─────────────────────────────────────────── */

function formatHour(i: number): string {
  if (i === 0) return "12a";
  if (i < 12) return `${i}a`;
  if (i === 12) return "12p";
  return `${i - 12}p`;
}

/* ─── Custom Tooltip ──────────────────────────────────── */

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg px-3 py-2 shadow-xl">
      <span
        className="text-[10px] text-[#6B7280]"
        style={{ fontFamily: "var(--font-poppins), monospace" }}
      >
        {label}: {payload[0].value} articles
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RELATED & TIMELINE TAB
   ═══════════════════════════════════════════════════════════ */

export default function RelatedTimelineTab({ article }: { article: Article }) {
  const { articles } = useKeywordStore();

  // Build trend chart data from sparkline
  const sparkline = useMemo(() => generateSparkline(article.trendScore), [article.trendScore]);
  const chartData = useMemo(
    () => sparkline.map((count, i) => ({ hour: formatHour(i), count })),
    [sparkline]
  );

  // Find related articles (same cluster or similar source)
  const relatedArticles = useMemo(() => {
    if (article.clusterId) {
      return articles
        .filter((a) => a.id !== article.id && a.clusterId === article.clusterId)
        .slice(0, 5);
    }
    return articles
      .filter((a) => a.id !== article.id && a.source === article.source)
      .slice(0, 5);
  }, [articles, article]);

  // Unique sources across all articles
  const uniqueSources = useMemo(() => {
    const sources = [...new Set(articles.map((a) => a.source))];
    return sources.slice(0, 8);
  }, [articles]);

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-24 overflow-y-auto max-h-[calc(100vh-30vh-120px)]">
      {/* Section label */}
      <span
        className="text-[10px] text-[#9CA3AF] tracking-widest uppercase"
        style={{ fontFamily: "var(--font-poppins), monospace" }}
      >
        Related &amp; Timeline
      </span>

      {/* 1. Related Articles Timeline */}
      <div className="flex flex-col gap-0">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-[#E63946]" />
          <span
            className="text-xs text-[#374151] font-medium"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            {relatedArticles.length > 0 ? "Related Stories" : "Current Article"}
          </span>
        </div>

        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-[#E5E7EB]" />

          {/* Current article */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="relative flex flex-col gap-1 pb-5"
          >
            <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#E63946] border-2 border-[#F8F9FA]" />
            <span
              className="text-[10px] text-[#9CA3AF]"
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              {article.timestamp}
            </span>
            <span
              className="text-[#1A1A2E] text-sm leading-snug"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {article.headline}
            </span>
            <span className="text-[10px] text-[#9CA3AF]">{article.source}</span>
          </motion.div>

          {/* Related articles */}
          {relatedArticles.map((related, i) => (
            <motion.div
              key={related.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: (i + 1) * 0.1 }}
              className="relative flex flex-col gap-1 pb-5 last:pb-0"
            >
              <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#F1F5F9] border-2 border-[#E5E7EB]" />
              <span
                className="text-[10px] text-[#9CA3AF]"
                style={{ fontFamily: "var(--font-poppins), monospace" }}
              >
                {related.timestamp}
              </span>
              <span
                className="text-[#4B5563] text-sm leading-snug line-clamp-2"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                {related.headline}
              </span>
              <span className="text-[10px] text-[#9CA3AF]">{related.source}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 2. Source Diversity Pills */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#E63946]" />
          <span
            className="text-xs text-[#374151] font-medium"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            {uniqueSources.length} sources covering this topic
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {uniqueSources.map((source) => (
            <span
              key={source}
              className="px-3 py-1 rounded-full text-[11px] bg-[#FFFFFF] border border-[#E5E7EB] text-[#4B5563]"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {source}
            </span>
          ))}
        </div>
      </div>

      {/* 3. Trend Chart */}
      <div className="flex flex-col gap-3">
        <span
          className="text-xs text-[#374151] font-medium"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          Trend Volume
        </span>

        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis
                dataKey="hour"
                tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "var(--font-poppins)" }}
                axisLine={false}
                tickLine={false}
                interval={3}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#E63946"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: "#E63946", stroke: "#F8F9FA", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
