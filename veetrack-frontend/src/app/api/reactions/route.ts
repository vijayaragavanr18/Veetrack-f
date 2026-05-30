import { NextRequest, NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════════
   VEETRACK REACTIONS API — Server-side proxy
   
   Proxies browser requests to external APIs (Mastodon, Hacker News,
   Wikidata) so the user's IP is never leaked and CORS is not an issue.
   
   Accepts POST with { keyword: string, sources: string[] }
   Returns combined results as JSON.
   ═══════════════════════════════════════════════════════════ */

interface MastodonStatus {
  id: string;
  content: string;
  url: string;
  created_at: string;
  account: {
    display_name: string;
    username: string;
  };
}

interface HNResult {
  id: string;
  title: string;
  points: number;
  numComments: number;
  url: string;
  author: string;
}

interface WikidataEntity {
  label: string;
  description: string;
  entityId: string;
  facts: Record<string, string>;
  url: string;
}

interface ReactionResponse {
  mastodon: MastodonStatus[];
  hackernews: HNResult[];
  wikidata: WikidataEntity | null;
}

/* ─── Wikidata Claim Extractors (shared with feed-utils) ─ */

function extractWDValue(
  claim: Record<string, unknown>[],
  detailData: Record<string, unknown>,
): string {
  try {
    const mainsnak = claim[0]?.mainsnak as Record<string, unknown> | undefined;
    if (!mainsnak) return "";
    const datavalue = mainsnak.datavalue as Record<string, unknown> | undefined;
    if (!datavalue) return "";
    const value = datavalue.value as Record<string, unknown> | undefined;
    if (!value) return "";

    if (datavalue.type === "wikibase-entityid") {
      const id = value.id as string;
      const entity = (detailData.entities as Record<string, Record<string, unknown>>)?.[id];
      if (entity) {
        const labels = entity.labels as Record<string, Record<string, string>> | undefined;
        if (labels?.en?.value) return labels.en.value;
      }
      return id;
    }

    if (typeof value === "string") return value;
    if (value.text) return value.text as string;
    return "";
  } catch {
    return "";
  }
}

function extractWDTime(claim: Record<string, unknown>[]): string {
  try {
    const mainsnak = claim[0]?.mainsnak as Record<string, unknown> | undefined;
    if (!mainsnak) return "";
    return extractWDTimeInner(mainsnak);
  } catch {
    return "";
  }
}

function extractWDTimeInner(mainsnak: Record<string, unknown>): string {
  const datavalue = mainsnak.datavalue as Record<string, unknown> | undefined;
  if (!datavalue) return "";
  const value = datavalue.value as Record<string, unknown> | undefined;
  if (!value) return "";
  const time = value.time as string;
  if (!time) return "";
  const match = time.match(/^[+-]?(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    if (match[2] === "00" || match[3] === "00") return match[1];
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return time;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ─── Data Fetchers ───────────────────────────────────── */

async function fetchMastodonReactions(keyword: string): Promise<MastodonStatus[]> {
  try {
    const url =
      `https://mastodon.social/api/v2/search?q=${encodeURIComponent(keyword)}&type=statuses&limit=5`;
    const res = await fetch(url, {
      headers: { "User-Agent": "VeeTrack/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const statuses = data.statuses ?? [];

    return statuses.map((s: Record<string, unknown>) => ({
      id: s.id as string,
      content: stripHtmlTags((s.content as string) ?? ""),
      url: (s.url as string) ?? "",
      created_at: (s.created_at as string) ?? "",
      account: {
        display_name: ((s.account as Record<string, unknown>)?.display_name as string) ?? "unknown",
        username: ((s.account as Record<string, unknown>)?.username as string) ?? "",
      },
    }));
  } catch {
    return [];
  }
}

async function fetchHackerNewsReactions(keyword: string): Promise<HNResult[]> {
  try {
    const url =
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&tags=story&hitsPerPage=5`;
    const res = await fetch(url, {
      headers: { "User-Agent": "VeeTrack/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const hits = data.hits ?? [];

    return hits.map((h: Record<string, unknown>) => ({
      id: h.objectID as string,
      title: (h.title as string) ?? "",
      points: (h.points as number) ?? 0,
      numComments: (h.num_comments as number) ?? 0,
      url: (h.url as string) ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
      author: (h.author as string) ?? "",
    }));
  } catch {
    return [];
  }
}

async function fetchWikidataReactions(keyword: string): Promise<WikidataEntity | null> {
  try {
    // Step 1: Search for entity
    const searchUrl =
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(keyword)}&language=en&limit=1&format=json`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "VeeTrack/1.0 (media-intelligence-platform)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const results = searchData.search ?? [];
    if (results.length === 0) return null;

    const top = results[0];

    // Step 2: Get entity details for facts
    try {
      const detailUrl =
        `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${top.id}&props=claims|labels|descriptions&languages=en&format=json`;
      const detailRes = await fetch(detailUrl, {
        headers: { "User-Agent": "VeeTrack/1.0 (media-intelligence-platform)" },
        signal: AbortSignal.timeout(8000),
      });

      if (detailRes.ok) {
        const detailJson = await detailRes.json();
        const entity = detailJson.entities?.[top.id];
        const facts: Record<string, string> = {};
        const claims = entity?.claims ?? {};

        if (claims.P31) { const v = extractWDValue(claims.P31, detailJson); if (v) facts["Type"] = v; }
        if (claims.P169) { const v = extractWDValue(claims.P169, detailJson); if (v) facts["CEO / Head"] = v; }
        if (claims.P452) { const v = extractWDValue(claims.P452, detailJson); if (v) facts["Industry"] = v; }
        if (claims.P17) { const v = extractWDValue(claims.P17, detailJson); if (v) facts["Country"] = v; }
        if (claims.P571) { const v = extractWDTime(claims.P571); if (v) facts["Founded"] = v; }
        if (claims.P159) { const v = extractWDValue(claims.P159, detailJson); if (v) facts["Headquarters"] = v; }
        if (claims.P106) { const v = extractWDValue(claims.P106, detailJson); if (v) facts["Occupation"] = v; }
        if (claims.P27) { const v = extractWDValue(claims.P27, detailJson); if (v) facts["Nationality"] = v; }

        return {
          label: top.label ?? keyword,
          description: top.description ?? "",
          entityId: top.id,
          facts,
          url: `https://www.wikidata.org/wiki/${top.id}`,
        };
      }
    } catch {
      // Detail fetch failed, return basic entity
    }

    return {
      label: top.label ?? keyword,
      description: top.description ?? "",
      entityId: top.id,
      facts: {},
      url: `https://www.wikidata.org/wiki/${top.id}`,
    };
  } catch {
    return null;
  }
}

/* ─── POST Handler ─────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const keyword = String(body.keyword ?? "").trim();
    const sources: string[] = Array.isArray(body.sources)
      ? body.sources.map(String)
      : ["mastodon", "hackernews", "wikidata"];

    if (!keyword) {
      return NextResponse.json(
        { mastodon: [], hackernews: [], wikidata: null } satisfies ReactionResponse,
        { status: 200 },
      );
    }

    // Fetch requested sources in parallel
    const fetchMap: Record<string, () => Promise<MastodonStatus[] | HNResult[] | WikidataEntity | null>> = {
      mastodon: () => fetchMastodonReactions(keyword),
      hackernews: () => fetchHackerNewsReactions(keyword),
      wikidata: () => fetchWikidataReactions(keyword),
    };

    const activeSources = sources.filter((s) => s in fetchMap);

    const results = await Promise.allSettled(
      activeSources.map((source) => fetchMap[source]()),
    );

    const response: ReactionResponse = {
      mastodon: [],
      hackernews: [],
      wikidata: null,
    };

    for (let i = 0; i < activeSources.length; i++) {
      const source = activeSources[i];
      const result = results[i];
      if (result.status === "fulfilled") {
        if (source === "mastodon") {
          response.mastodon = result.value as MastodonStatus[];
        } else if (source === "hackernews") {
          response.hackernews = result.value as HNResult[];
        } else if (source === "wikidata") {
          response.wikidata = result.value as WikidataEntity | null;
        }
      }
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[VeeTrack Reactions API] Error:", error);
    return NextResponse.json(
      { mastodon: [], hackernews: [], wikidata: null } satisfies ReactionResponse,
      { status: 200 },
    );
  }
}
