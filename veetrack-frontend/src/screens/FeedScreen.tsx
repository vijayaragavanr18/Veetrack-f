"use client";

import { useReducer, useEffect, useRef, useCallback } from "react";
import { motion, PanInfo } from "framer-motion";
import { ArrowLeft, Zap, SearchX, Loader2, ChevronUp, ChevronDown, ShieldAlert } from "lucide-react";
import { useKeywordStore } from "@/lib/stores/keyword-store";
import { useChatStore } from "@/lib/stores/chat-store";
import { CATEGORY_CONFIG, Article } from "@/lib/data/articles";
import FlipContainer from "@/components/FlipContainer";
import ConnectionIndicator from "@/components/alerts/ConnectionIndicator";
import AlertBadge from "@/components/alerts/AlertBadge";
import ArticleChat, { ChatBubble } from "@/components/chat/ArticleChat";

/* ─── Flip Animation State Reducer ──────────────────── */

interface FlipState {
  currentIndex: number;
  exitArticle: Article | null;
  isFlipping: boolean;
  flipDir: number;
  committedIndex: number;
}

type FlipAction =
  | { type: "RESET" }
  | { type: "START_FLIP"; newIndex: number; prevArticle: Article | null; direction: number }
  | { type: "END_FLIP"; newIndex: number };

const initialFlipState: FlipState = {
  currentIndex: 0,
  exitArticle: null,
  isFlipping: false,
  flipDir: 1,
  committedIndex: 0,
};

function flipReducer(state: FlipState, action: FlipAction): FlipState {
  switch (action.type) {
    case "RESET":
      return { ...initialFlipState };
    case "START_FLIP":
      return {
        ...state,
        currentIndex: action.newIndex,
        exitArticle: action.prevArticle,
        isFlipping: true,
        flipDir: action.direction,
      };
    case "END_FLIP":
      return {
        ...state,
        exitArticle: null,
        isFlipping: false,
        committedIndex: action.newIndex,
      };
    default:
      return state;
  }
}

/* ─── Skeleton Page ──────────────────────────────────── */

function SkeletonPage() {
  const cat = CATEGORY_CONFIG.Technology;
  return (
    <div className={`flex-1 rounded-2xl overflow-hidden bg-gradient-to-br ${cat.gradient} border ${cat.border} animate-pulse`}>
      <div className={`h-1.5 w-full ${cat.bg.replace("/10", "/30")}`} />
      <div className="px-5 pt-5 pb-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-28 rounded bg-[#F1F5F9]" />
          <div className="h-4 w-20 rounded bg-[#F1F5F9]" />
        </div>
        <div className="space-y-3">
          <div className="h-7 w-full rounded bg-[#F1F5F9]" />
          <div className="h-7 w-3/4 rounded bg-[#F1F5F9]" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-[#F1F5F9]" />
          <div className="h-4 w-24 rounded bg-[#F1F5F9]" />
        </div>
        <div className="h-px bg-[#F1F5F9]" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-[#F1F5F9]" />
          <div className="h-4 w-5/6 rounded bg-[#F1F5F9]" />
          <div className="h-4 w-2/3 rounded bg-[#F1F5F9]" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-4 w-20 rounded bg-[#F1F5F9]" />
          <div className="h-4 w-16 rounded bg-[#F1F5F9]" />
          <div className="h-4 w-16 rounded bg-[#F1F5F9]" />
        </div>
        <div className="h-1 w-full rounded-full bg-[#F1F5F9]" />
        <div className="flex gap-2">
          <div className="h-4 w-16 rounded-full bg-[#F1F5F9]" />
          <div className="h-4 w-20 rounded-full bg-[#F1F5F9]" />
          <div className="h-4 w-14 rounded-full bg-[#F1F5F9]" />
        </div>
        <div className="flex gap-3 mt-2">
          <div className="h-10 w-36 rounded-xl bg-[#F1F5F9]" />
          <div className="h-10 w-24 rounded-xl bg-[#F1F5F9]" />
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────── */

function EmptyState({ keyword, onRetry }: { keyword: string | null; onRetry: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
      <div className="w-16 h-16 rounded-2xl bg-[#FFFFFF] border border-[#E5E7EB] flex items-center justify-center">
        <SearchX className="w-8 h-8 text-[#D1D5DB]" />
      </div>
      <h2
        className="text-[#374151] text-lg font-bold text-center"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        No articles found
      </h2>
      <p
        className="text-[#6B7280] text-sm text-center max-w-xs"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        {keyword
          ? `We couldn't find any articles for "${keyword}". Try a different keyword.`
          : "Enter a keyword to search for articles."}
      </p>
      <button
        onClick={onRetry}
        className="
          mt-2 px-5 py-2.5 rounded-xl text-sm font-medium
          bg-[#E63946]/8 border border-[#E63946]/15 text-[#E63946]
          hover:bg-[#E63946]/10 transition-colors duration-200
        "
      >
        Try again
      </button>
    </div>
  );
}

/* ─── Loading Indicator ──────────────────────────────── */

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#F8F9FA]/80 backdrop-blur-sm gap-4">
      <div className="relative">
        <Loader2 className="w-10 h-10 text-[#E63946] animate-spin" />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span
          className="text-[#374151] text-sm font-medium"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          Searching sources...
        </span>
        <span
          className="text-[#6B7280] text-xs"
          style={{ fontFamily: "var(--font-poppins), monospace" }}
        >
          GDELT · RSS · Hacker News · Mastodon · Wikipedia · Wikidata
        </span>
      </div>
    </div>
  );
}

/* ─── Progress Dots ──────────────────────────────────── */

function ProgressDots({ current, total, onSelect }: { current: number; total: number; onSelect: (i: number) => void }) {
  const maxDots = Math.min(total, 12);
  const startIdx = current > 8 ? Math.min(current - 4, total - maxDots) : 0;
  const visibleDots = Array.from({ length: maxDots }, (_, i) => startIdx + i);

  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      {visibleDots.map((i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`
            w-1.5 rounded-full transition-all duration-300
            ${i === current
              ? "h-4 bg-[#E63946]"
              : "h-1.5 bg-[#D1D5DB] hover:bg-[#9CA3AF]"
            }
          `}
          aria-label={`Go to article ${i + 1}`}
        />
      ))}
    </div>
  );
}

/* ─── Feed Screen — Flipboard Half-Page Vertical Flip ──── */

const FLIP_CLEANUP_MS = 700;

export default function FeedScreen() {
  const {
    activeKeyword,
    articles,
    isLoading,
    fetchError,
    setScreen,
    navigateToArticle,
    fetchArticles,
  } = useKeywordStore();

  const { setArticleContext, clearArticleContext } = useChatStore();

  const hasFetched = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const flipCleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flip animation state via reducer
  const [flip, dispatch] = useReducer(flipReducer, initialFlipState);

  // Derive displayArticle from current index
  const displayArticle: Article | null = articles.length > 0
    ? (articles[flip.currentIndex] ?? null)
    : null;

  // Update chat context when current article changes
  useEffect(() => {
    if (displayArticle) {
      setArticleContext(displayArticle);
    } else {
      clearArticleContext();
    }
  }, [displayArticle, setArticleContext, clearArticleContext]);

  // Reset when keyword changes
  useEffect(() => {
    dispatch({ type: "RESET" });
  }, [activeKeyword]);

  // Fetch articles when screen loads
  useEffect(() => {
    if (activeKeyword && !hasFetched.current) {
      hasFetched.current = true;
      fetchArticles(activeKeyword);
    }
  }, [activeKeyword, fetchArticles]);

  // Reset fetch flag when keyword changes
  useEffect(() => {
    hasFetched.current = false;
  }, [activeKeyword]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (flipCleanupRef.current) clearTimeout(flipCleanupRef.current);
    };
  }, []);

  const handleCardNavigate = useCallback((id: string) => {
    navigateToArticle(id);
  }, [navigateToArticle]);

  const handleRetry = useCallback(() => {
    if (activeKeyword) {
      hasFetched.current = true;
      fetchArticles(activeKeyword);
    }
  }, [activeKeyword, fetchArticles]);

  // Navigation — starts the half-flip animation
  const navigateToIndex = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= articles.length) return;

    const fromIndex = flip.isFlipping ? flip.committedIndex : flip.currentIndex;
    if (newIndex === fromIndex) return;

    const dir = newIndex > fromIndex ? 1 : -1;
    const prevArticle = articles[fromIndex] ?? null;

    // Clean up any previous animation timeout
    if (flipCleanupRef.current) clearTimeout(flipCleanupRef.current);

    // Start flip
    dispatch({
      type: "START_FLIP",
      newIndex,
      prevArticle,
      direction: dir,
    });

    // End flip after animation completes
    flipCleanupRef.current = setTimeout(() => {
      dispatch({ type: "END_FLIP", newIndex });
    }, FLIP_CLEANUP_MS);
  }, [articles, flip.isFlipping, flip.committedIndex, flip.currentIndex]);

  const goToArticle = useCallback((index: number) => {
    navigateToIndex(index);
  }, [navigateToIndex]);

  const goNext = useCallback(() => {
    const from = flip.isFlipping ? flip.committedIndex : flip.currentIndex;
    navigateToIndex(from + 1);
  }, [navigateToIndex, flip.isFlipping, flip.committedIndex, flip.currentIndex]);

  const goPrev = useCallback(() => {
    const from = flip.isFlipping ? flip.committedIndex : flip.currentIndex;
    navigateToIndex(from - 1);
  }, [navigateToIndex, flip.isFlipping, flip.committedIndex, flip.currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  // Swipe gesture handler
  const handleSwipe = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.y < -threshold) {
      goNext();
    } else if (info.offset.y > threshold) {
      goPrev();
    }
  }, [goNext, goPrev]);

  // Wheel handler for mouse scroll navigation
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (wheelTimeoutRef.current) return;

    const threshold = 30;
    if (e.deltaY > threshold) {
      goNext();
    } else if (e.deltaY < -threshold) {
      goPrev();
    }

    wheelTimeoutRef.current = setTimeout(() => {
      wheelTimeoutRef.current = null;
    }, 800);
  }, [goNext, goPrev]);

  const currentArticle = articles[flip.currentIndex];
  const hasPrev = flip.currentIndex > 0;
  const hasNext = flip.currentIndex < articles.length - 1;

  // Category of current article for accent theming
  const currentCat = currentArticle
    ? (CATEGORY_CONFIG[currentArticle.category] ?? CATEGORY_CONFIG.General)
    : CATEGORY_CONFIG.General;

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative h-screen flex flex-col bg-[#F8F9FA] overflow-hidden"
    >
      {/* Loading overlay */}
      {isLoading && <LoadingOverlay />}

      {/* ── Sticky header ── */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-[#F8F9FA]/90 backdrop-blur-xl border-b border-[#E5E7EB]/50 z-30">
        <button
          onClick={() => setScreen("input")}
          className="
            w-9 h-9 rounded-xl flex items-center justify-center
            bg-[#FFFFFF] border border-[#E5E7EB]
            text-[#6B7280] hover:text-[#1A1A2E] hover:border-[#E63946]/30
            transition-colors duration-200
          "
          aria-label="Back to search"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-[#E63946] fill-[#E63946]/15" />
          <h1
            className="text-sm font-bold tracking-[0.15em] uppercase"
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            <span className="text-[#1A1A2E]">Vee</span>
            <span className="text-[#E63946]">Track</span>
          </h1>
        </div>

        {activeKeyword && (
          <div className="ml-auto px-2.5 py-1 rounded-full bg-[#E63946]/8 border border-[#E63946]/15 text-[#E63946] text-xs font-medium">
            {activeKeyword}
          </div>
        )}

        {/* Article counter */}
        {!isLoading && articles.length > 0 && (
          <span
            className="text-[11px] text-[#9CA3AF] font-medium"
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            {flip.currentIndex + 1}/{articles.length}
          </span>
        )}

        <div className="ml-1">
          <ConnectionIndicator />
        </div>

        {/* Intelligence Pipeline button */}
        <button
          onClick={() => setScreen("intelligence")}
          className="
            ml-1 w-9 h-9 rounded-xl flex items-center justify-center
            bg-[#E63946]/8 border border-[#E63946]/15
            text-[#E63946]/70 hover:text-[#E63946] hover:border-[#E63946]/30
            transition-colors duration-200
          "
          aria-label="Intelligence Report"
        >
          <ShieldAlert className="w-4 h-4" />
        </button>
      </header>

      {/* ── Main content area ── */}
      {isLoading ? (
        <div className="flex-1 p-4">
          <SkeletonPage />
        </div>
      ) : articles.length > 0 && displayArticle ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Flip area with swipe gesture */}
          <div
            ref={containerRef}
            className="flex-1 relative p-4"
            onWheel={handleWheel}
          >
            {/* FlipContainer handles the half-page flip animation */}
            <motion.div
              className="absolute inset-4"
              onPanEnd={handleSwipe}
            >
              <FlipContainer
                displayArticle={displayArticle}
                exitArticle={flip.exitArticle}
                isFlipping={flip.isFlipping}
                flipDir={flip.flipDir}
                onNavigate={handleCardNavigate}
              />
            </motion.div>

            {/* ── Prev article peek (top edge) ── */}
            {hasPrev && (
              <button
                onClick={goPrev}
                className="
                  absolute top-0 left-4 right-4 z-20
                  flex items-center justify-center
                  h-8
                  bg-gradient-to-b from-[#F8F9FA]/80 to-transparent
                  text-[#D1D5DB] hover:text-[#6B7280]
                  transition-colors duration-200
                  cursor-pointer
                "
                aria-label="Previous article"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            )}

            {/* ── Next article peek (bottom edge) ── */}
            {hasNext && (
              <button
                onClick={goNext}
                className="
                  absolute bottom-0 left-4 right-4 z-20
                  flex items-center justify-center
                  h-8
                  bg-gradient-to-t from-[#F8F9FA]/80 to-transparent
                  text-[#D1D5DB] hover:text-[#6B7280]
                  transition-colors duration-200
                  cursor-pointer
                "
                aria-label="Next article"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            )}

            {/* ── Swipe hint (first article only, fades away) ── */}
            {flip.currentIndex === 0 && articles.length > 1 && (
              <motion.div
                className="absolute bottom-10 left-0 right-0 z-15 flex flex-col items-center gap-1 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.5 }}
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ChevronDown className="w-5 h-5 text-[#9CA3AF]" />
                </motion.div>
                <span
                  className="text-[10px] text-[#9CA3AF] uppercase tracking-widest"
                  style={{ fontFamily: "var(--font-poppins), monospace" }}
                >
                  Swipe up
                </span>
              </motion.div>
            )}
          </div>

          {/* ── Right side progress dots ── */}
          <div className="shrink-0 flex items-center justify-center px-1">
            <ProgressDots
              current={flip.currentIndex}
              total={articles.length}
              onSelect={goToArticle}
            />
          </div>
        </div>
      ) : (
        <EmptyState keyword={activeKeyword} onRetry={handleRetry} />
      )}

      {/* ── Bottom nav bar ── */}
      {!isLoading && articles.length > 1 && (
        <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-[#F8F9FA]/90 backdrop-blur-xl border-t border-[#E5E7EB]/50 z-30">
          <button
            onClick={goPrev}
            disabled={!hasPrev}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold
              transition-all duration-200
              ${hasPrev
                ? "bg-[#F1F5F9] border border-[#E5E7EB] text-[#4B5563] hover:text-[#1A1A2E] hover:border-[#D1D5DB]"
                : "bg-transparent border border-transparent text-[#D1D5DB] cursor-not-allowed"
              }
            `}
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            <ChevronUp className="w-4 h-4" />
            Prev
          </button>

          {/* Category + sentiment mini indicator */}
          {currentArticle && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{currentCat.emoji}</span>
              <span
                className={`text-[10px] font-bold tracking-wider uppercase ${currentCat.color}`}
                style={{ fontFamily: "var(--font-poppins), monospace" }}
              >
                {currentArticle.category}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  currentArticle.sentiment.label === "positive" ? "bg-[#22C55E]"
                    : currentArticle.sentiment.label === "negative" ? "bg-[#DC2626]"
                    : "bg-[#6B7280]"
                }`}
              />
            </div>
          )}

          <button
            onClick={goNext}
            disabled={!hasNext}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold
              transition-all duration-200
              ${hasNext
                ? `${currentCat.bg} ${currentCat.color} border ${currentCat.border} hover:brightness-125`
                : "bg-transparent border border-transparent text-[#D1D5DB] cursor-not-allowed"
              }
            `}
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            Next
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error toast */}
      {fetchError && !isLoading && (
        <div className="absolute bottom-20 left-4 right-4 z-50 bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-xl px-4 py-3 text-[#DC2626] text-xs">
          {fetchError}
        </div>
      )}

      {/* Alert badge (floating) */}
      <AlertBadge />

      {/* Article chat (floating bubble + panel) */}
      <ChatBubble />
      <ArticleChat />
    </motion.div>
  );
}
