"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { useAlertStore, type VeeAlert, type AlertPriority } from "@/lib/stores/alert-store";
import { useKeywordStore } from "@/lib/stores/keyword-store";

/* ─── Priority config ─────────────────────────────────── */

const PRIORITY_CONFIG: Record<
  AlertPriority,
  { icon: string; duration: number; border: string; style: React.CSSProperties }
> = {
  CRITICAL: {
    icon: "🚨",
    duration: Infinity,
    border: "border-[#EF4444]/40",
    style: {
      background: "#FFFFFF",
      border: "1px solid rgba(239,68,68,0.4)",
      color: "#1A1A2E",
      maxWidth: "100%",
      width: "calc(100vw - 32px)",
      boxShadow: "0 8px 32px rgba(239,68,68,0.15), 0 2px 8px rgba(0,0,0,0.08)",
    },
  },
  HIGH: {
    icon: "⚠️",
    duration: 8000,
    border: "border-[#F97316]/40",
    style: {
      background: "#FFFFFF",
      border: "1px solid rgba(249,115,22,0.4)",
      color: "#1A1A2E",
      boxShadow: "0 8px 32px rgba(249,115,22,0.12), 0 2px 8px rgba(0,0,0,0.08)",
    },
  },
  MEDIUM: {
    icon: "📈",
    duration: 5000,
    border: "border-[#F59E0B]/40",
    style: {
      background: "#FFFFFF",
      border: "1px solid rgba(245,158,11,0.4)",
      color: "#1A1A2E",
      boxShadow: "0 8px 32px rgba(245,158,11,0.12), 0 2px 8px rgba(0,0,0,0.08)",
    },
  },
  LOW: {
    icon: "ℹ️",
    duration: 3000,
    border: "border-[#3B82F6]/40",
    style: {
      background: "#FFFFFF",
      border: "1px solid rgba(59,130,246,0.4)",
      color: "#1A1A2E",
      boxShadow: "0 8px 32px rgba(59,130,246,0.12), 0 2px 8px rgba(0,0,0,0.08)",
    },
  },
};

/* ─── Toast content renderer ──────────────────────────── */

function AlertToastContent({
  alert,
  onView,
}: {
  alert: VeeAlert;
  onView: () => void;
}) {
  const cfg = PRIORITY_CONFIG[alert.priority];
  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-base shrink-0">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <span
          className="text-xs font-semibold text-[#1A1A2E] block truncate"
          style={{ fontFamily: "var(--font-poppins), sans-serif" }}
        >
          {alert.keyword}
        </span>
        <span
          className="text-[11px] text-[#6B7280] block truncate"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          {alert.message}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onView();
          toast.dismiss();
        }}
        className="
          shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold
          bg-[#E63946]/15 text-[#E63946] border border-[#E63946]/25
          hover:bg-[#E63946]/20 transition-colors duration-150
        "
        style={{ fontFamily: "var(--font-poppins), sans-serif" }}
      >
        View →
      </button>
    </div>
  );
}

/* ─── Alert Toast (mount once in app root) ────────────── */

export default function AlertToast() {
  const alerts = useAlertStore((s) => s.alerts);
  const addKeyword = useKeywordStore((s) => s.addKeyword);
  const setActiveKeyword = useKeywordStore((s) => s.setActiveKeyword);
  const setScreen = useKeywordStore((s) => s.setScreen);
  const lastToastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (alerts.length === 0) return;

    const latest = alerts[0];
    if (latest.id === lastToastIdRef.current) return;
    lastToastIdRef.current = latest.id;

    const cfg = PRIORITY_CONFIG[latest.priority];

    const handleView = () => {
      addKeyword(latest.keyword);
      setActiveKeyword(latest.keyword);
      setScreen("feed");
    };

    toast.custom(
      (t) => (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`
            rounded-xl px-4 py-3 backdrop-blur-md
            ${cfg.border}
          `}
          style={cfg.style}
        >
          <AlertToastContent alert={latest} onView={handleView} />
        </motion.div>
      ),
      {
        duration: cfg.duration,
        position: "top-center",
      }
    );
  }, [alerts, addKeyword, setActiveKeyword, setScreen]);

  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: "transparent",
          boxShadow: "none",
          padding: 0,
          margin: 0,
        },
      }}
    />
  );
}
