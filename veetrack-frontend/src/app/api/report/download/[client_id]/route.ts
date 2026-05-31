import { proxyRequest } from "@/lib/proxy";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ client_id: string }> }) {
  const { client_id } = await params;
  return proxyRequest(req, `/api/report/download/${client_id}${req.nextUrl.search}`);
}
