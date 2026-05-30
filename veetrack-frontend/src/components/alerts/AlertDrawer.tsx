"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Trash2 } from "lucide-react";
import { useAlertStore, type AlertPriority } from "@/lib/stores/alert-store";

/* ─── Priority badge config ───────────────────────────── */

const PRIORITY_BADGE: Record<AlertPriority, { bg: string; text: string; label: string }> = {
  CRITICAL: { bg: "bg-[#EF4444]/20 border-[#EF4444]/30", text: "text-[#EF4444]", label: "CRITICAL" },
  HIGH: { bg: "bg-[#F97316]/20 border-[#F97316]/30", text: "text-[#F97316]", label: "HIGH" },
  MEDIUM: { bg: "bg-[#F59E0B]/20 border-[#F59E0B]/30", text: "text-[#F59E0B]", label: "MED" },
  LOW: { bg: "bg-[#3B82F6]/20 border-[#3B82F6]/30", text: "text-[#3B82F6]", label: "LOW" },
};

/* ─── Relative time helper ────────────────────────────── */

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/* ─── Alert Drawer ────────────────────────────────────── */

interface AlertDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AlertDrawer({ isOpen, onClose }: AlertDrawerProps) {
  const alerts = useAlertStore((s) => s.alerts);
  const markAllRead = useAlertStore((s) => s.markAllRead);
  const clearAlerts = useAlertStore((s) => s.clearAlerts);

  const recentAlerts = alerts.slice(0, 20);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="
              fixed bottom-0 left-0 right-0 z-50
              h-[50vh] rounded-t-2xl
              bg-[#FFFFFF] border-t border-[#E5E7EB]
              flex flex-col overflow-hidden
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#E63946]" />
                <span
                  className="text-sm font-semibold text-[#1A1A2E]"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  Alert History
                </span>
                <span
                  className="text-[10px] text-[#9CA3AF]"
                  style={{ fontFamily: "var(--font-poppins), monospace" }}
                >
                  ({recentAlerts.length})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    markAllRead();
                    clearAlerts();
                  }}
                  className="
                    flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px]
                    bg-[#DC2626]/10 border border-[#DC2626]/20 text-[#DC2626]
                    hover:bg-[#DC2626]/15 transition-colors duration-150
                  "
                  style={{ fontFamily: "var(--font-poppins), monospace" }}
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#1A1A2E] hover:bg-[#F1F5F9] transition-colors duration-150"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Alert list */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {recentAlerts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <Bell className="w-8 h-8 text-[#D1D5DB]" />
                  <p className="text-[#6B7280] text-sm">No alerts yet</p>
                  <p className="text-[#9CA3AF] text-xs">Alerts will appear here as they arrive</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentAlerts.map((alert, i) => {
                    const badge = PRIORITY_BADGE[alert.priority];
                    return (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="flex items-start gap-3 py-2.5 border-b border-[#E5E7EB]/50 last:border-0"
                      >
                        {/* Priority badge */}
                        <span
                          className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold border ${badge.bg} ${badge.text}`}
                          style={{ fontFamily: "var(--font-poppins), monospace" }}
                        >
                          {badge.label}
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs font-semibold text-[#1A1A2E] truncate"
                              style={{ fontFamily: "var(--font-inter), sans-serif" }}
                            >
                              {alert.keyword}
                            </span>
                          </div>
                          <span
                            className="text-[11px] text-[#6B7280] line-clamp-1"
                            style={{ fontFamily: "var(--font-inter), sans-serif" }}
                          >
                            {alert.message}
                          </span>
                        </div>

                        {/* Timestamp */}
                        <span
                          className="shrink-0 text-[9px] text-[#9CA3AF] mt-0.5"
                          style={{ fontFamily: "var(--font-poppins), monospace" }}
                        >
                          {relativeTime(alert.timestamp)}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
