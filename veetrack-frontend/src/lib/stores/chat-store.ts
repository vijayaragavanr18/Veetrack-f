import { create } from "zustand";
import type { Article } from "@/lib/data/articles";

/* ─── Chat Message Types ────────────────────────────── */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

/* ─── Chat Store ────────────────────────────────────── */

interface ChatState {
  isOpen: boolean;
  isTyping: boolean;
  messages: ChatMessage[];
  articleContext: Article | null;
  openChat: (article: Article) => void;
  closeChat: () => void;
  toggleChat: () => void;
  setArticleContext: (article: Article) => void;
  clearArticleContext: () => void;
  addMessage: (role: "user" | "assistant", content: string) => void;
  setTyping: (typing: boolean) => void;
  clearMessages: () => void;
  sendMessage: (content: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  isOpen: false,
  isTyping: false,
  messages: [],
  articleContext: null,

  openChat: (article: Article) =>
    set({
      isOpen: true,
      articleContext: article,
      messages: get().articleContext?.id !== article.id
        ? [] // Clear messages when switching articles
        : get().messages,
    }),

  closeChat: () => set({ isOpen: false }),

  toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),

  setArticleContext: (article: Article) =>
    set({
      articleContext: article,
      messages: get().articleContext?.id !== article.id
        ? []
        : get().messages,
    }),

  clearArticleContext: () => set({ articleContext: null, messages: [] }),

  addMessage: (role, content) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role,
          content,
          timestamp: Date.now(),
        },
      ],
    })),

  setTyping: (typing) => set({ isTyping: typing }),

  clearMessages: () => set({ messages: [] }),

  sendMessage: async (content: string) => {
    const { addMessage, setTyping, articleContext } = get();

    if (!content.trim()) return;

    // Add user message
    addMessage("user", content.trim());
    setTyping(true);

    try {
      // Call local chat API (mock now, Ollama later)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.trim(),
          article: articleContext
            ? {
                headline: articleContext.headline,
                source: articleContext.source,
                category: articleContext.category,
                sentiment: articleContext.sentiment,
                summary: articleContext.summary,
                entities: articleContext.entities,
                riskScore: articleContext.riskScore,
                trendScore: articleContext.trendScore,
                whyItMatters: articleContext.whyItMatters,
                suggestedAction: articleContext.suggestedAction,
              }
            : null,
        }),
      });

      if (!res.ok) throw new Error(`Chat API returned ${res.status}`);

      const data = await res.json();
      addMessage("assistant", data.reply || "I couldn't generate a response.");
    } catch {
      addMessage(
        "assistant",
        "Sorry, I'm having trouble connecting. Please try again.",
      );
    } finally {
      setTyping(false);
    }
  },
}));
