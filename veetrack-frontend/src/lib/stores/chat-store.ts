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
  sessionId: string | null; // Backend RAG session ID
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
  sessionId: null,

  openChat: (article: Article) =>
    set((s) => {
      const switching = s.articleContext?.id !== article.id;
      return {
        isOpen: true,
        articleContext: article,
        messages: switching ? [] : s.messages,
        sessionId: switching ? null : s.sessionId,
      };
    }),

  closeChat: () => set({ isOpen: false }),

  toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),

  setArticleContext: (article: Article) =>
    set((s) => {
      const switching = s.articleContext?.id !== article.id;
      return {
        articleContext: article,
        messages: switching ? [] : s.messages,
        sessionId: switching ? null : s.sessionId,
      };
    }),

  clearArticleContext: () =>
    set({ articleContext: null, messages: [], sessionId: null }),

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

  clearMessages: () => set({ messages: [], sessionId: null }),

  sendMessage: async (content: string) => {
    const { addMessage, setTyping, articleContext } = get();

    if (!content.trim()) return;

    // Add user message immediately
    addMessage("user", content.trim());
    setTyping(true);

    try {
      let { sessionId } = get();

      // ── Step 1: Start a RAG session if we don't have one ──
      // Backend chunks the article text, builds a FAISS index,
      // and returns a session_id for subsequent questions.
      if (!sessionId && articleContext) {
        const startRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            article_text: [
              articleContext.headline,
              articleContext.summary,
              articleContext.whyItMatters,
              articleContext.suggestedAction,
            ]
              .filter(Boolean)
              .join("\n\n"),
            article_title: articleContext.headline,
            article_url: articleContext.url || "",
          }),
        });

        if (startRes.ok) {
          const startData = await startRes.json();
          sessionId = startData.session_id ?? null;
          set({ sessionId });
        }
      }

      // ── Step 2: Ask the question using session_id ──
      // Backend does FAISS semantic search to find relevant chunks,
      // then sends them to Qwen2.5 (Ollama) as context for generation.
      if (sessionId) {
        const askRes = await fetch("/api/chat/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            question: content.trim(),
          }),
        });

        if (!askRes.ok) throw new Error(`Chat API returned ${askRes.status}`);

        const askData = await askRes.json();
        addMessage(
          "assistant",
          askData.answer || "I couldn't generate a response.",
        );
      } else {
        // Fallback: no session available
        addMessage(
          "assistant",
          articleContext
            ? `Based on this article: "${articleContext.summary || articleContext.headline}"`
            : "Sorry, no article context is loaded. Please select an article first.",
        );
      }
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
