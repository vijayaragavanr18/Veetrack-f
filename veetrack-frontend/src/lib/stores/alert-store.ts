import { create } from "zustand";

/* ─── Types ───────────────────────────────────────────── */

export type AlertPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface VeeAlert {
  id: string;
  type: string;
  keyword: string;
  message: string;
  priority: AlertPriority;
  score: number;
  threshold: number;
  articleId: number | null;
  timestamp: number;
}

/* ─── Normalise priority strings from backend ─────────── */

const PRIORITY_NORMALIZE: Record<string, AlertPriority> = {
  // lowercase from new alert engine
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
  // uppercase from legacy / mock
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
};

function normalizePriority(raw: string): AlertPriority {
  return PRIORITY_NORMALIZE[raw] ?? "LOW";
}

/* ─── Store ───────────────────────────────────────────── */

interface AlertState {
  alerts: VeeAlert[];
  unreadCount: number;
  wsConnected: boolean;
  addAlert: (alert: VeeAlert) => void;
  markAllRead: () => void;
  clearAlerts: () => void;
  setWsConnected: (connected: boolean) => void;
}

export const useAlertStore = create<AlertState>()((set) => ({
  alerts: [],
  unreadCount: 0,
  wsConnected: false,

  addAlert: (alert: VeeAlert) =>
    set((state) => ({
      alerts: [{ ...alert, priority: normalizePriority(alert.priority) }, ...state.alerts].slice(0, 50), // keep last 50
      unreadCount: state.unreadCount + 1,
    })),

  markAllRead: () =>
    set({ unreadCount: 0 }),

  clearAlerts: () =>
    set({ alerts: [], unreadCount: 0 }),

  setWsConnected: (connected: boolean) =>
    set({ wsConnected: connected }),
}));
