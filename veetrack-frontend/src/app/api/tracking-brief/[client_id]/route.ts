import { proxyRequest } from "@/lib/proxy";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ client_id: string }> }) {
  const { client_id } = await params;
  return proxyRequest(req, `/api/tracking-brief/${client_id}`);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ client_id: string }> }) {
  const { client_id } = await params;
  return proxyRequest(req, `/api/tracking-brief/${client_id}`);
}
