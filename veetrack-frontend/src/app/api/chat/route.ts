import { proxyRequest } from "@/lib/proxy";

export async function POST(req: Request) {
  return proxyRequest(req, "/api/chat");
}

export async function DELETE(req: Request) {
  return proxyRequest(req, "/api/chat");
}
