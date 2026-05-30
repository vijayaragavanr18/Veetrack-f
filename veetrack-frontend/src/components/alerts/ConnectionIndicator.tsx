"use client";

import { useAlertStore } from "@/lib/stores/alert-store";

/**
 * Connection status indicator — green dot (connected) or red dot (disconnected)
 * Displayed in the top-right corner of the feed header.
 */
export default function ConnectionIndicator() {
  const connected = useAlertStore((s) => s.wsConnected);

  return (
    <div className="flex items-center gap-1.5" title={connected ? "Live connected" : "Disconnected"}>
      <div
        className={`w-2 h-2 rounded-full ${
          connected ? "bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.5)]" : "bg-[#EF4444] shadow-[0_0_6px_rgba(239,68,68,0.3)]"
        } transition-colors duration-300`}
      />
      <span
        className="text-[9px] text-[#9CA3AF] hidden sm:inline"
        style={{ fontFamily: "var(--font-poppins), monospace" }}
      >
        {connected ? "LIVE" : "OFF"}
      </span>
    </div>
  );
}
