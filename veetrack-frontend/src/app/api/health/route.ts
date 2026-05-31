import { proxyRequest } from "@/lib/proxy";

export async function GET(req: Request) {
  return proxyRequest(req, "/health");
}
