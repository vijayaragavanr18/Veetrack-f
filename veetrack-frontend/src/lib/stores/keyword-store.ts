import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Article } from "@/lib/data/articles";

export type ScreenType = "input" | "feed" | "article" | "intelligence";

/* ─── Intelligence Report Types ─────────────────── */

export interface ScoredArticle {
  headline: string;
  url: string;
  snippet: string;
  fullContent: string;
  publication: string;
  edition: string;
  date: string;
  section: "company" | "competition" | "industry";
  sentiment: "positive" | "negative" | "neutral";
  sentimentConfidence: number;
  sentimentReason: string;
  entities: { people: string[]; organizations: string[]; locations: string[] };
  sarcasmFlag: boolean;
  sarcasmReason: string;
  businessImpact: string;
  tone: string;
  keyQuote: string;
  relevanceScore: number;
  relevanceExplanation: string;
  isPriority: boolean;
}

export interface IntelligenceReport {
  date: string;
  generatedAt: string;
  clientName: string;
  criticalAlerts: ScoredArticle[];
  priorityItems: ScoredArticle[];
  companyNews: ScoredArticle[];
  competitionNews: ScoredArticle[];
  industryNews: ScoredArticle[];
  executiveBrief: { happened: string; whyItMatters: string; recommendedAction: string; trendOutlook: string };
  stats: { totalFound: number; afterRelevance: number; critical: number; priority: number; positiveCount: number; negativeCount: number; neutralCount: number; sourcesCount: number };
  errors: string[];
}

interface KeywordState {
  keywords: string[];
  activeKeyword: string | null;
  screen: ScreenType;
  selectedArticleId: string | null;
  articles: Article[];
  isLoading: boolean;
  fetchError: string | null;
  // Intelligence report state
  intelligenceReport: IntelligenceReport | null;
  isIntelligenceLoading: boolean;
  intelligenceError: string | null;
  addKeyword: (keyword: string) => void;
  removeKeyword: (keyword: string) => void;
  setActiveKeyword: (keyword: string) => void;
  setScreen: (screen: ScreenType) => void;
  navigateToArticle: (id: string) => void;
  setArticles: (articles: Article[]) => void;
  setIsLoading: (loading: boolean) => void;
  setFetchError: (error: string | null) => void;
  fetchArticles: (keyword: string) => Promise<void>;
  runIntelligencePipeline: (client?: string) => Promise<void>;
  setIntelligenceReport: (report: IntelligenceReport | null) => void;
}

const STARTER_KEYWORDS = ["Vee Technologies", "AI", "Startup India"];

export const useKeywordStore = create<KeywordState>()(
  persist(
    (set, get) => ({
      keywords: STARTER_KEYWORDS,
      activeKeyword: null,
      screen: "input",
      selectedArticleId: null,
      articles: [],
      isLoading: false,
      fetchError: null,
      intelligenceReport: null,
      isIntelligenceLoading: false,
      intelligenceError: null,

      addKeyword: (keyword: string) =>
        set((state) => {
          const trimmed = keyword.trim();
          if (!trimmed || state.keywords.includes(trimmed)) return state;
          return { keywords: [...state.keywords, trimmed] };
        }),

      removeKeyword: (keyword: string) =>
        set((state) => ({
          keywords: state.keywords.filter((k) => k !== keyword),
          activeKeyword:
            state.activeKeyword === keyword ? null : state.activeKeyword,
        })),

      setActiveKeyword: (keyword: string) =>
        set({ activeKeyword: keyword }),

      setScreen: (screen: ScreenType) =>
        set({ screen }),

      navigateToArticle: (id: string) =>
        set({ screen: "article", selectedArticleId: id }),

      setArticles: (articles: Article[]) =>
        set({ articles }),

      setIsLoading: (loading: boolean) =>
        set({ isLoading: loading }),

      setFetchError: (error: string | null) =>
        set({ fetchError: error }),

      fetchArticles: async (keyword: string) => {
        set({ isLoading: true, fetchError: null, articles: [] });

        try {
          const res = await fetch("/api/feed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword, max_results: 30 }),
          });

          if (!res.ok) {
            throw new Error(`API returned ${res.status}`);
          }

          const data = await res.json();
          set({
            articles: data.articles ?? [],
            isLoading: false,
            fetchError: null,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to fetch articles";
          set({
            articles: [],
            isLoading: false,
            fetchError: message,
          });
        }
      },

      setIntelligenceReport: (report: IntelligenceReport | null) =>
        set({ intelligenceReport: report }),

      runIntelligencePipeline: async (client = "ZEE5") => {
        set({ isIntelligenceLoading: true, intelligenceError: null, intelligenceReport: null });

        try {
          const res = await fetch("/api/intelligence", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client }),
          });

          if (!res.ok) {
            throw new Error(`Intelligence API returned ${res.status}`);
          }

          const data = await res.json();
          if (!data.success || !data.report) {
            throw new Error(data.error || "Intelligence pipeline failed");
          }

          set({
            intelligenceReport: data.report,
            isIntelligenceLoading: false,
            intelligenceError: null,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Intelligence pipeline failed";
          set({
            intelligenceReport: null,
            isIntelligenceLoading: false,
            intelligenceError: message,
          });
        }
      },
    }),
    {
      name: "veetrack-keywords",
      partialize: (state) => ({
        keywords: state.keywords,
        activeKeyword: state.activeKeyword,
      }),
    }
  )
);
