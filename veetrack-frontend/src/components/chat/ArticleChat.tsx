"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { useChatStore } from "@/lib/stores/chat-store";
import type { Article } from "@/lib/data/articles";

/* ─── Quick Suggestion Chips ─────────────────────────── */

function getSuggestions(article: Article | null): string[] {
  if (!article) return [];
  const suggestions: string[] = [];
  if (article.sentiment.label !== "neutral") {
    suggestions.push(`Why is the sentiment ${article.sentiment.label}?`);
  }
  if (article.entities.length > 0) {
    suggestions.push(`Tell me more about ${article.entities[0].text}`);
  }
  suggestions.push("What should I watch for?");
  if (article.riskScore > 50) {
    suggestions.push("How to handle this risk?");
  }
  return suggestions.slice(0, 3);
}

/* ─── Chat Panel ────────────────────────────────────── */

export default function ArticleChat() {
  const {
    isOpen,
    isTyping,
    messages,
    articleContext,
    closeChat,
    sendMessage,
  } = useChatStore();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isTyping) return;
    sendMessage(input);
    setInput("");
  }, [input, isTyping, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const suggestions = getSuggestions(articleContext);

  return (
    <AnimatePresence>
      {isOpen && articleContext && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="
            fixed bottom-20 right-4 z-50
            w-[calc(100vw-2rem)] sm:w-[380px]
            max-h-[60vh] min-h-[320px]
            bg-white rounded-2xl
            border border-[#E5E7EB]
            shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]
            flex flex-col overflow-hidden
          "
        >
          {/* ── Header ── */}
          <div className="shrink-0 flex items-center gap-2.5 px-4 py-3 border-b border-[#E5E7EB] bg-[#FAFAFA]">
            <div className="w-8 h-8 rounded-xl bg-[#E63946]/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#E63946]" />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[#1A1A2E] text-xs font-bold tracking-wide uppercase"
                style={{ fontFamily: "var(--font-poppins), monospace" }}
              >
                Article Chat
              </p>
              <p className="text-[#9CA3AF] text-[10px] truncate">
                {articleContext.headline}
              </p>
            </div>
            <button
              onClick={closeChat}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F1F5F9] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E63946]/8 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-[#E63946]/60" />
                </div>
                <p
                  className="text-[#6B7280] text-xs text-center leading-relaxed px-2"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  Ask me anything about this article. I can explain context,
                  analyze sentiment, or discuss implications.
                </p>
                {/* Suggestion chips */}
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }}
                        className="
                          px-2.5 py-1.5 rounded-lg text-[10px] font-medium
                          bg-[#F1F5F9] border border-[#E5E7EB] text-[#4B5563]
                          hover:bg-[#E63946]/5 hover:border-[#E63946]/15 hover:text-[#E63946]
                          transition-colors duration-200
                        "
                        style={{ fontFamily: "var(--font-inter), sans-serif" }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message list */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="shrink-0 w-6 h-6 rounded-lg bg-[#E63946]/10 flex items-center justify-center mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#E63946]" />
                  </div>
                )}
                <div
                  className={`
                    max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed
                    ${
                      msg.role === "user"
                        ? "bg-[#E63946] text-white rounded-br-sm"
                        : "bg-[#F1F5F9] text-[#374151] rounded-bl-sm border border-[#E5E7EB]"
                    }
                  `}
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="shrink-0 w-6 h-6 rounded-lg bg-[#E63946]/10 flex items-center justify-center mt-0.5">
                    <User className="w-3.5 h-3.5 text-[#E63946]" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-2 justify-start">
                <div className="shrink-0 w-6 h-6 rounded-lg bg-[#E63946]/10 flex items-center justify-center mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[#E63946]" />
                </div>
                <div className="bg-[#F1F5F9] border border-[#E5E7EB] rounded-xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 text-[#9CA3AF] animate-spin" />
                  <span className="text-[10px] text-[#9CA3AF]">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input bar ── */}
          <div className="shrink-0 px-3 py-2.5 border-t border-[#E5E7EB] bg-[#FAFAFA]">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this article..."
                disabled={isTyping}
                className="
                  flex-1 h-9 px-3 rounded-xl
                  bg-white border border-[#E5E7EB]
                  text-[#1A1A2E] text-xs placeholder:text-[#9CA3AF]
                  focus:outline-none focus:border-[#E63946]/30 focus:ring-1 focus:ring-[#E63946]/10
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                "
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className={`
                  w-9 h-9 rounded-xl flex items-center justify-center
                  transition-all duration-200
                  ${
                    input.trim() && !isTyping
                      ? "bg-[#E63946] text-white shadow-sm hover:bg-[#D32F3F]"
                      : "bg-[#F1F5F9] text-[#9CA3AF] cursor-not-allowed"
                  }
                `}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[9px] text-[#B0B0B0] mt-1.5 text-center">
              Local AI · Qwen 1.5B (Mock) · No data sent to cloud
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Floating Chat Bubble ──────────────────────────── */

export function ChatBubble() {
  const { isOpen, articleContext, toggleChat } = useChatStore();

  // Don't show bubble if no article context
  if (!articleContext) return null;

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      onClick={toggleChat}
      className="
        fixed bottom-5 right-5 z-50
        w-12 h-12 rounded-2xl
        flex items-center justify-center
        shadow-[0_8px_30px_-8px_rgba(230,57,70,0.4)]
        transition-all duration-300
        hover:scale-105 hover:shadow-[0_12px_40px_-8px_rgba(230,57,70,0.5)]
        active:scale-95
      "
      style={{
        background: isOpen
          ? "linear-gradient(135deg, #374151, #1A1A2E)"
          : "linear-gradient(135deg, #E63946, #D32F3F)",
      }}
      aria-label={isOpen ? "Close chat" : "Open article chat"}
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <X className="w-5 h-5 text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="open"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <MessageCircle className="w-5 h-5 text-white" />
            {/* Pulse indicator */}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#22C55E] rounded-full border-2 border-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
