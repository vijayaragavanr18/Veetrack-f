import { proxyRequest } from "@/lib/proxy";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return proxyRequest(req, "/api/tracking-brief");
}
export async function POST(req: NextRequest) {
  return proxyRequest(req, "/api/tracking-brief");
}
