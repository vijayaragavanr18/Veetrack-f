"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, FileText, Download, RefreshCw, Loader2 } from "lucide-react";

interface KeywordConfig {
  keyword: string;
  languages: string[];
  compound_filter?: string;
}

interface TrackingBrief {
  client_id: string;
  client_name: string;
  company_keywords: KeywordConfig[];
  competition_keywords: KeywordConfig[];
  industry_keywords: KeywordConfig[];
  report_email: string;
  report_time: string;
}

interface BriefFeed {
  client_id: string;
  client_name: string;
  date: string;
  company: any[];
  competition: any[];
  industry: any[];
  total: number;
}

interface Props {
  onBack: () => void;
}

export default function ClientBriefScreen({ onBack }: Props) {
  const [briefs, setBriefs] = useState<TrackingBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [feedData, setFeedData] = useState<BriefFeed | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tracking-brief")
      .then((r) => r.json())
      .then((d) => {
        setBriefs(d.briefs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadFeed = async (clientId: string) => {
    setSelectedClient(clientId);
    setFeedData(null);
    setFeedLoading(true);
    try {
      const r = await fetch(`/api/feed/brief/${clientId}`);
      const data = await r.json();
      setFeedData(data);
    } catch {
      // noop
    } finally {
      setFeedLoading(false);
    }
  };

  const generateReport = async (clientId: string) => {
    setGenerating(clientId);
    try {
      await fetch(`/api/report/generate/${clientId}`, { method: "POST" });
    } finally {
      setTimeout(() => setGenerating(null), 3000);
    }
  };

  const downloadReport = (clientId: string) => {
    const today = new Date().toISOString().split("T")[0];
    window.open(`/api/report/download/${clientId}?date=${today}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="min-h-screen bg-[#0A0A0F] text-white p-4 pb-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[#00D4FF] text-sm font-medium hover:text-[#33DEFF] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#00D4FF]" />
          <h1 className="font-mono text-xl font-bold text-white">
            Client <span className="text-[#00D4FF]">Briefs</span>
          </h1>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading clients...
        </div>
      )}

      {/* Client list */}
      <div className="space-y-3 mb-6">
        {briefs.map((brief) => (
          <motion.div
            key={brief.client_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              bg-[#111120] border rounded-xl p-4
              transition-colors duration-200
              ${selectedClient === brief.client_id
                ? "border-[#00D4FF]/40 bg-[#0d1220]"
                : "border-[#1e1e2e] hover:border-[#2e2e3e]"}
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-white text-sm">{brief.client_name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{brief.report_email}</div>
                <div className="text-xs text-gray-600 mt-1">
                  Daily report: {brief.report_time} IST
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => loadFeed(brief.client_id)}
                  disabled={feedLoading && selectedClient === brief.client_id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-colors disabled:opacity-50"
                >
                  {feedLoading && selectedClient === brief.client_id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Load Feed
                </button>
                <button
                  onClick={() => generateReport(brief.client_id)}
                  disabled={generating === brief.client_id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                >
                  {generating === brief.client_id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <FileText className="w-3 h-3" />
                  )}
                  {generating === brief.client_id ? "Generating..." : "Gen PDF"}
                </button>
                <button
                  onClick={() => downloadReport(brief.client_id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-600/30 text-gray-400 hover:bg-gray-500/10 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
              </div>
            </div>

            {/* Keyword counts */}
            <div className="flex gap-4 text-xs">
              <span className="text-[#00D4FF]/60">
                Company: <span className="text-[#00D4FF]">{brief.company_keywords?.length || 0}</span>
              </span>
              <span className="text-purple-400/60">
                Competition: <span className="text-purple-400">{brief.competition_keywords?.length || 0}</span>
              </span>
              <span className="text-orange-400/60">
                Industry: <span className="text-orange-400">{brief.industry_keywords?.length || 0}</span>
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Feed results */}
      {feedData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-sm font-semibold text-gray-400 mb-4">
            {feedData.client_name} — {feedData.total} articles ({feedData.date})
          </div>

          {(["company", "competition", "industry"] as const).map((cat) => {
            const items = feedData[cat];
            if (!items || items.length === 0) return null;
            const labels = {
              company: { label: "Company News", color: "text-[#00D4FF]", border: "border-[#00D4FF]/20", bg: "bg-[#00D4FF]/5" },
              competition: { label: "Competition News", color: "text-purple-400", border: "border-purple-400/20", bg: "bg-purple-400/5" },
              industry: { label: "Industry News", color: "text-orange-400", border: "border-orange-400/20", bg: "bg-orange-400/5" },
            }[cat];

            return (
              <div key={cat} className="mb-5">
                <div className={`${labels.bg} border ${labels.border} rounded-lg px-3 py-2 mb-2`}>
                  <span className={`${labels.color} text-xs font-bold uppercase tracking-wide`}>
                    {labels.label} ({items.length})
                  </span>
                </div>
                {items.slice(0, 6).map((a: any, i: number) => (
                  <div
                    key={i}
                    className="bg-[#0d0d18] border border-[#1e1e2e] rounded-lg p-3 mb-2 hover:border-[#2e2e3e] transition-colors"
                  >
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-sm font-medium leading-snug hover:text-[#00D4FF] transition-colors"
                    >
                      {a.title}
                    </a>
                    <div className="flex gap-2 text-xs text-gray-500 mt-1">
                      <span>{a.source}</span>
                      <span>·</span>
                      <span>{a.matchedKeyword}</span>
                      <span>·</span>
                      <span>{a.published_at?.substring(0, 10)}</span>
                    </div>
                  </div>
                ))}
                {items.length > 6 && (
                  <p className="text-xs text-gray-600 text-center mt-1">
                    +{items.length - 6} more articles
                  </p>
                )}
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
