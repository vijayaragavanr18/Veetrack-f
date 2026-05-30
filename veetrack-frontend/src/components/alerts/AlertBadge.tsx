"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { useAlertStore } from "@/lib/stores/alert-store";
import AlertDrawer from "./AlertDrawer";

/**
 * Floating alert badge — bottom-right of feed screen.
 * Shows unread count as a red number badge.
 * Tap → opens Alert History drawer.
 */
export default function AlertBadge() {
  const unreadCount = useAlertStore((s) => s.unreadCount);
  const markAllRead = useAlertStore((s) => s.markAllRead);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleTap = () => {
    markAllRead();
    setDrawerOpen(true);
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.5 }}
        onClick={handleTap}
        className="
          fixed bottom-20 right-5 z-30
          w-14 h-14 rounded-2xl
          bg-[#FFFFFF] border border-[#E5E7EB]
          shadow-lg shadow-black/10
          flex items-center justify-center
          hover:border-[#E63946]/20 hover:bg-[#FFFFFF]/80
          active:scale-95
          transition-all duration-200
        "
        aria-label={`Alerts: ${unreadCount} unread`}
      >
        <Bell className="w-6 h-6 text-[#4B5563]" />

        {/* Unread count badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="
                absolute -top-1.5 -right-1.5
                min-w-[20px] h-5 px-1
                rounded-full bg-[#DC2626]
                flex items-center justify-center
                text-[10px] font-bold text-white
                shadow-md shadow-[#DC2626]/20
              "
              style={{ fontFamily: "var(--font-poppins), monospace" }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AlertDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
