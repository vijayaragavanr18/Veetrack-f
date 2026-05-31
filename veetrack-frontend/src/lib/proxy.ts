/**
 * VeeTrack Proxy Helper
 *
 * All Next.js API routes are thin proxies to FastAPI (port 8000).
 * No business logic lives in Next.js — only forwarding.
 */

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

/**
 * Proxy a standard JSON request to FastAPI.
 * Forwards method, body, and query params.
 * Returns 503 with clear error if FastAPI is down.
 */
export async function proxyRequest(
  req: Request,
  path: string,
): Promise<Response> {
  const url = new URL(path, BACKEND);
  new URL(req.url).searchParams.forEach((v, k) =>
    url.searchParams.set(k, v),
  );
  try {
    const body = req.method !== "GET" ? await req.text() : undefined;
    const res = await fetch(url.toString(), {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body,
    });
    return new Response(res.body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return Response.json(
      { error: "Backend unavailable. Is FastAPI running?", code: 503 },
      { status: 503 },
    );
  }
}

/**
 * Proxy an SSE stream from FastAPI to the browser.
 * Pipes the upstream stream directly with correct SSE headers.
 * Sends a single error event and closes if FastAPI is down.
 */
export async function proxySSE(
  path: string,
  searchParams: string,
): Promise<Response> {
  const url = `${BACKEND}${path}?${searchParams}`;
  try {
    const upstream = await fetch(url, {
      headers: { Accept: "text/event-stream" },
    });
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    const fallback = new ReadableStream({
      start(c) {
        c.enqueue(
          new TextEncoder().encode(
            'data: {"type":"error","message":"Backend offline"}\n\n',
          ),
        );
        c.close();
      },
    });
    return new Response(fallback, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }
}
