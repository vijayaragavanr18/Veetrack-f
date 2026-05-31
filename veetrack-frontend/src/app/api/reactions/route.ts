import { proxyRequest } from "@/lib/proxy";

export async function POST(req: Request) {
  return proxyRequest(req, "/api/reactions");
}
