import { proxySSE } from "@/lib/proxy";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams.toString();
  return proxySSE("/api/alerts", params);
}
