import { NextRequest, NextResponse } from "next/server";

const HN_ALGOLIA_BASE = "https://hn.algolia.com/api/v1";

interface HNResult {
  id: string;
  title: string;
  points: number;
  numComments: number;
  url: string;
  author: string;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const limit = request.nextUrl.searchParams.get("limit") ?? "5";

  if (!q) {
    return NextResponse.json({ error: "Missing query parameter: q" }, { status: 400 });
  }

  try {
    const url = `${HN_ALGOLIA_BASE}/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=${limit}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "VeeTrack/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      const hits: HNResult[] = (data.hits ?? []).map((hit: Record<string, unknown>) => ({
        id: hit.objectID as string,
        title: (hit.title as string) ?? "",
        points: (hit.points as number) ?? 0,
        numComments: (hit.num_comments as number) ?? 0,
        url: (hit.url as string) ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
        author: (hit.author as string) ?? "anonymous",
      }));

      return NextResponse.json({ hits, source: "algolia" });
    }
  } catch {
    // Fall through to empty response
  }

  // API failed — return empty data (no mock)
  return NextResponse.json({ hits: [], source: "" });
}
