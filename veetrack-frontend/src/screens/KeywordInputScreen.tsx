"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Zap, ShieldAlert } from "lucide-react";
import { useKeywordStore } from "@/lib/stores/keyword-store";

/* ─── Animation variants ──────────────────────────────────── */

const logoVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const subtitleVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.3, ease: "easeOut" as const },
  },
};

const inputVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 120,
      damping: 18,
      delay: 0.4,
    },
  },
};

const chipContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.7 },
  },
};

const chipVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.8 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 200, damping: 20 },
  },
  exit: {
    opacity: 0,
    scale: 0.7,
    transition: { duration: 0.2 },
  },
};

/* ─── Component ───────────────────────────────────────────── */

export default function KeywordInputScreen() {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { keywords, activeKeyword, addKeyword, removeKeyword, setActiveKeyword, setScreen } =
    useKeywordStore();

  // Auto-focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    addKeyword(trimmed);
    setActiveKeyword(trimmed);
    setInputValue("");
    setScreen("feed");
  };

  const handleChipClick = (keyword: string) => {
    setActiveKeyword(keyword);
    setScreen("feed");
  };

  return (
    <div className="noise-overlay relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 overflow-hidden">
      {/* ── Intelligence button (top right) ── */}
      <button
        onClick={() => setScreen("intelligence")}
        className="
          fixed top-4 right-4 z-50
          flex items-center gap-2 px-4 py-2.5 rounded-xl
          bg-[#FFFFFF] border border-[#E5E7EB]
          text-[#E63946]/70 hover:text-[#E63946] hover:border-[#E63946]/40
          hover:bg-[#E63946]/5
          transition-all duration-200
        "
        style={{ fontFamily: "var(--font-poppins), monospace" }}
      >
        <ShieldAlert className="w-4 h-4" />
        <span className="text-[11px] font-semibold tracking-wider uppercase hidden sm:inline">Intelligence</span>
      </button>

      {/* ── Ambient background glow ── */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#E63946]/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#E63946]/[0.03] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl flex flex-col items-center gap-8">
        {/* ── Logo / Wordmark ── */}
        <motion.div
          variants={logoVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-3"
        >
          <div className="flex items-center gap-1">
            <Zap className="w-8 h-8 text-[#E63946] fill-[#E63946]/15" />
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-[0.2em] uppercase"
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            <span className="text-[#1A1A2E]">Vee</span>
            <span className="text-[#E63946]">Track</span>
          </h1>
        </motion.div>

        {/* ── Subtitle ── */}
        <motion.p
          variants={subtitleVariants}
          initial="hidden"
          animate="visible"
          className="text-sm sm:text-base text-[#6B7280] tracking-wide text-center"
        >
          AI-Powered Media Intelligence
        </motion.p>

        {/* ── Search Input ── */}
        <motion.form
          variants={inputVariants}
          initial="hidden"
          animate="visible"
          onSubmit={handleSubmit}
          className="w-full"
        >
          <div
            className={`
              input-accent-glow
              relative flex items-center w-full rounded-2xl
              border transition-colors duration-300
              ${
                isFocused
                  ? "border-[#E63946]/50 bg-[#FFFFFF]"
                  : "border-[#E5E7EB] bg-[#FFFFFF]"
              }
            `}
          >
            <Search className="ml-4 sm:ml-5 w-5 h-5 text-[#6B7280] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Enter keyword, brand, or topic..."
              className="
                flex-1 bg-transparent py-4 sm:py-5 px-3 sm:px-4
                text-[#1A1A2E] text-base sm:text-lg placeholder:text-[#9CA3AF]
                outline-none
              "
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="
                mr-2 sm:mr-3 px-4 sm:px-6 py-2.5 sm:py-3
                rounded-xl font-semibold text-sm sm:text-base
                bg-[#E63946] text-white
                hover:bg-[#C62D3A] active:bg-[#AB1F2B]
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-all duration-200 shrink-0
              "
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              <span className="hidden sm:inline">Monitor Now</span>
              <span className="sm:hidden">Go</span>
            </button>
          </div>
        </motion.form>

        {/* ── Recent Keywords Chips ── */}
        <motion.div
          variants={chipContainerVariants}
          initial="hidden"
          animate="visible"
          className="w-full flex flex-col items-center gap-3"
        >
          <p
            className="text-xs text-[#6B7280] tracking-widest uppercase"
            style={{ fontFamily: "var(--font-poppins), monospace" }}
          >
            Recent Keywords
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <AnimatePresence mode="popLayout">
              {keywords.map((keyword) => (
                <motion.button
                  key={keyword}
                  variants={chipVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  onClick={() => handleChipClick(keyword)}
                  className="
                    group flex items-center gap-1.5 px-4 py-2
                    rounded-full text-sm
                    bg-[#FFFFFF] border border-[#E5E7EB]
                    text-[#E63946] hover:border-[#E63946]/40
                    hover:bg-[#E63946]/5
                    transition-colors duration-200 cursor-pointer
                  "
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  <span>{keyword}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeKeyword(keyword);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        removeKeyword(keyword);
                      }
                    }}
                    className="
                      ml-0.5 w-4 h-4 rounded-full
                      flex items-center justify-center
                      text-[#6B7280] hover:text-[#EF4444]
                      hover:bg-[#EF4444]/10
                      transition-colors duration-150
                    "
                  >
                    <X className="w-3 h-3" />
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
