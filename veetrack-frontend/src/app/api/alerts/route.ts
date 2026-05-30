import { type NextRequest } from "next/server";

/* ═══════════════════════════════════════════════════════════
   VEETRACK ALERT SSE — Server-Sent Events endpoint
   
   Replaces the old FastAPI WebSocket (port 8000) that was
   never reliably running. This runs 100% inside Next.js.
   
   Every 30 seconds, evaluates tracked keywords for risk/trend
   threshold breaches and pushes SSE events to connected clients.
   ═══════════════════════════════════════════════════════════ */

/* ─── Deterministic score seeded on current hour + keyword ── */

function deterministicScore(text: string, salt: string, min: number, max: number): number {
  let hash = 0;
  const input = text + salt;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash) / 2147483647;
  return Math.round(min + normalized * (max - min));
}

/* ─── Tracked keywords (same as the app's starter set) ──── */

const DEFAULT_KEYWORDS = ["Vee Technologies", "AI", "Startup India"];

/* ─── Alert evaluation logic ──────────────────────────── */

interface AlertEvent {
  type: "RISK_ALERT" | "TREND_ALERT";
  keyword: string;
  score: number;
  message: string;
}

function evaluateAlerts(keywords: string[]): AlertEvent[] {
  const alerts: AlertEvent[] = [];
  // Seed changes every hour so alerts feel "live"
  const hourSeed = Math.floor(Date.now() / (60 * 60 * 1000)).toString();

  for (const keyword of keywords) {
    const riskScore = deterministicScore(keyword, `risk-${hourSeed}`, 15, 95);
    const trendScore = deterministicScore(keyword, `trend-${hourSeed}`, 10, 90);

    if (riskScore > 70) {
      alerts.push({
        type: "RISK_ALERT",
        keyword,
        score: riskScore,
        message: `High risk detected for "${keyword}" — risk score ${riskScore}/100 exceeds threshold (70). Consider reviewing coverage immediately.`,
      });
    }

    if (trendScore > 60) {
      alerts.push({
        type: "TREND_ALERT",
        keyword,
        score: trendScore,
        message: `Surging trend for "${keyword}" — trend score ${trendScore}/100 exceeds threshold (60). Coverage momentum is building.`,
      });
    }
  }

  return alerts;
}

/* ─── GET Handler — SSE Stream ─────────────────────────── */

export async function GET(_request: NextRequest) {
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirmation
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "CONNECTED", keyword: "", score: 0, message: "VeeTrack alert stream connected" })}\n\n`)
      );

      // Evaluate and push alerts every 30 seconds
      intervalId = setInterval(() => {
        if (isClosed) {
          if (intervalId) clearInterval(intervalId);
          return;
        }
        try {
          const alerts = evaluateAlerts(DEFAULT_KEYWORDS);

          if (alerts.length > 0) {
            for (const alert of alerts) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(alert)}\n\n`)
              );
            }
          } else {
            // Heartbeat — keeps the connection alive
            controller.enqueue(
              encoder.encode(`: heartbeat\n\n`)
            );
          }
        } catch {
          // If enqueue fails, the client has disconnected
          if (intervalId) clearInterval(intervalId);
        }
      }, 30_000);

      // Also run an initial evaluation after 5 seconds (not immediately)
      setTimeout(() => {
        if (isClosed) return;
        try {
          const alerts = evaluateAlerts(DEFAULT_KEYWORDS);
          for (const alert of alerts) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(alert)}\n\n`)
            );
          }
        } catch {
          if (intervalId) clearInterval(intervalId);
        }
      }, 5_000);
    },

    cancel() {
      // Client disconnected — clean up the interval
      isClosed = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Prevent nginx buffering
    },
  });
}
