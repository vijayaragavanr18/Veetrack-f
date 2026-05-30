"use client";

import { useEffect } from "react";
import { useAlertStore, type VeeAlert } from "@/lib/stores/alert-store";

const SSE_URL = "/api/alerts";
const RETRY_DELAY = 5_000; // 5 seconds between retries

/**
 * Hook: useAlertSocket
 *
 * Connects to the VeeTrack alert SSE stream (Next.js Route Handler).
 * Replaces the old WebSocket that targeted FastAPI port 8000.
 *
 * Uses EventSource for Server-Sent Events:
 * - On open → set connectionStatus to 'connected'
 * - On message → parse and dispatch to Zustand alert store
 * - On error → set connectionStatus to 'reconnecting', retry after 5s
 *
 * Gracefully handles server not running — no console spam.
 */
export function useAlertSocket() {
  const addAlert = useAlertStore((s) => s.addAlert);
  const setWsConnected = useAlertStore((s) => s.setWsConnected);

  useEffect(() => {
    // Don't attempt SSE on server-side
    if (typeof window === "undefined") return;

    const mounted = { current: true };
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleReconnect() {
      if (!mounted.current) return;
      if (reconnectTimer) return;

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, RETRY_DELAY);
    }

    function connect() {
      if (!mounted.current) return;

      // Close any existing connection
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      try {
        const source = new EventSource(SSE_URL);

        source.onopen = () => {
          if (!mounted.current) return;
          setWsConnected(true);
        };

        source.onmessage = (event) => {
          if (!mounted.current) return;
          try {
            const data = JSON.parse(event.data);

            // Skip non-alert events (e.g., CONNECTED confirmation)
            if (data.type === "CONNECTED") return;

            // Map SSE event to VeeAlert shape
            const alert: VeeAlert = {
              id: `${data.type}-${data.keyword}-${Date.now()}`,
              type: data.type ?? "RISK_ALERT",
              keyword: data.keyword ?? "",
              message: data.message ?? "",
              priority: data.type === "RISK_ALERT" ? "HIGH" : "MEDIUM",
              score: data.score ?? 0,
              threshold: data.type === "RISK_ALERT" ? 70 : 60,
              articleId: null,
              timestamp: Date.now(),
            };

            if (alert.id && alert.priority && alert.message) {
              addAlert(alert);
            }
          } catch {
            // Ignore malformed messages
          }
        };

        source.onerror = () => {
          if (!mounted.current) return;
          setWsConnected(false);

          // Close the broken connection before reconnecting
          source.close();
          eventSource = null;
          scheduleReconnect();
        };

        eventSource = source;
      } catch {
        // EventSource not available or URL invalid — silent fail
        setWsConnected(false);
        scheduleReconnect();
      }
    }

    connect();

    return () => {
      mounted.current = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [addAlert, setWsConnected]);
}
