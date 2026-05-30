import { NextRequest, NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════════
   VEETRACK CHAT API — Mock AI Responses (Local First)

   This route currently generates contextual mock responses.
   When Ollama is running locally, it will call:
     POST http://localhost:11434/api/chat
   with model "qwen2.5:1.5b" and article context.

   NO CLOUD LLM — Everything stays local.
   ═══════════════════════════════════════════════════════════ */

interface ArticleContext {
  headline: string;
  source: string;
  category: string;
  sentiment: { label: string; score: number };
  summary: string;
  entities: Array<{ text: string; type: string }>;
  riskScore: number;
  trendScore: number;
  whyItMatters: string;
  suggestedAction: string;
}

/* ─── Ollama Integration (for future use) ───────────── */

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:1.5b";

async function callOllama(
  message: string,
  article: ArticleContext | null,
): Promise<string | null> {
  try {
    const systemPrompt = `You are VeeTrack AI, a media intelligence assistant. You discuss news articles with users, providing analysis, context, and insights. Be concise and helpful.

${article ? `Current article context:
- Headline: ${article.headline}
- Source: ${article.source}
- Category: ${article.category}
- Sentiment: ${article.sentiment.label} (${Math.round(article.sentiment.score * 100)}%)
- Risk Score: ${article.riskScore}/100
- Trend Score: ${article.trendScore}/100
- Summary: ${article.summary}
- Key Entities: ${article.entities.map((e) => `${e.text} (${e.type})`).join(", ")}
- Why It Matters: ${article.whyItMatters}
- Suggested Action: ${article.suggestedAction}

Only discuss this specific article. Stay on topic.` : "No article is currently being viewed."}`;

    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        stream: false,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/* ─── Mock Response Generator ──────────────────────── */

function generateMockResponse(
  message: string,
  article: ArticleContext | null,
): string {
  if (!article) {
    return "I don't have an article to discuss right now. Please view an article first, and then I can help you analyze it.";
  }

  const lower = message.toLowerCase();
  const headline = article.headline;
  const sentiment = article.sentiment.label;
  const source = article.source;
  const category = article.category;
  const entities = article.entities;
  const riskScore = article.riskScore;
  const summary = article.summary;

  // Sentiment-related questions
  if (lower.includes("sentiment") || lower.includes("positive") || lower.includes("negative") || lower.includes("tone")) {
    if (sentiment === "positive") {
      return `The sentiment around "${headline}" is positive with ${Math.round(article.sentiment.score * 100)}% confidence. This suggests the coverage is generally favorable — likely highlighting achievements, growth, or constructive developments. From ${source}, this kind of positive framing can boost stakeholder confidence and brand perception.`;
    }
    if (sentiment === "negative") {
      return `The sentiment is negative (${Math.round(article.sentiment.score * 100)}% confidence). This indicates concerning coverage from ${source} about "${headline}". Negative sentiment in ${category} coverage often signals potential reputational risks or stakeholder concerns. I'd recommend monitoring for escalation and preparing response messaging.`;
    }
    return `The coverage is neutral (${Math.round(article.sentiment.score * 100)}% confidence). This typically means factual, balanced reporting from ${source} without strong emotional framing. Neutral coverage in ${category} is common for straightforward news updates.`;
  }

  // Entity-related questions
  if (lower.includes("tell me more about") || lower.includes("who is") || lower.includes("what is")) {
    const queryEntity = entities.find((e) =>
      lower.includes(e.text.toLowerCase()),
    );
    if (queryEntity) {
      return `${queryEntity.text} is identified as a ${queryEntity.type} in this article from ${source}. In the context of "${headline}", they play a significant role. Based on the ${category} category and ${sentiment} sentiment, this entity's involvement could ${sentiment === "negative" ? "warrant caution" : "present opportunities"}. Would you like me to dig deeper into their role?`;
    }
    if (entities.length > 0) {
      return `The key entities in this article are: ${entities.map((e) => `${e.text} (${e.type})`).join(", ")}. Which one would you like to know more about?`;
    }
    return "No specific entities were extracted from this article. The coverage appears to be general in nature.";
  }

  // Risk-related questions
  if (lower.includes("risk") || lower.includes("danger") || lower.includes("threat") || lower.includes("handle")) {
    if (riskScore > 70) {
      return `This article carries a HIGH risk score of ${riskScore}/100. "${headline}" from ${source} has ${sentiment} sentiment and could significantly impact stakeholders. Immediate actions: 1) Alert key decision-makers, 2) Prepare holding statements, 3) Monitor for escalation every 30 minutes, 4) Engage legal if liability is involved.`;
    }
    if (riskScore > 40) {
      return `The risk score is moderate at ${riskScore}/100. While "${headline}" isn't critical, the ${sentiment} sentiment from ${source} warrants monitoring. Recommended: Track for 48 hours, prepare draft responses, and brief relevant teams.`;
    }
    return `Risk is low at ${riskScore}/100. "${headline}" from ${source} appears to be standard ${category} coverage with ${sentiment} tone. Routine monitoring is sufficient — no urgent action needed.`;
  }

  // Watch/monitoring questions
  if (lower.includes("watch") || lower.includes("monitor") || lower.includes("follow") || lower.includes("track")) {
    return `For "${headline}" from ${source}, here's what to watch:\n\n1. **Sentiment shifts** — Currently ${sentiment}, watch for escalation\n2. **Entity developments** — ${entities.slice(0, 2).map((e) => e.text).join(" and ")} may make further statements\n3. **Source spread** — If coverage moves beyond ${source} to other outlets, it's gaining traction\n4. **Risk trajectory** — At ${riskScore}/100, ${riskScore > 50 ? "any increase needs immediate attention" : "it's stable for now"}`;
  }

  // Summary/explain questions
  if (lower.includes("summarize") || lower.includes("explain") || lower.includes("what about") || lower.includes("overview") || lower.includes("brief")) {
    return `Here's the overview of "${headline}":\n\n📍 Source: ${source}\n📂 Category: ${category}\n💭 Sentiment: ${sentiment} (${Math.round(article.sentiment.score * 100)}%)\n⚠️ Risk: ${riskScore}/100\n\n${summary ? `Key details: ${summary}` : "The article discusses developments in the " + category + " space."}\n\n${entities.length > 0 ? `Key players: ${entities.map((e) => e.text).join(", ")}` : ""}`;
  }

  // Why/implication questions
  if (lower.includes("why") || lower.includes("implication") || lower.includes("impact") || lower.includes("matter")) {
    return article.whyItMatters
      ? `Here's why this matters: ${article.whyItMatters}\n\nGiven the ${sentiment} sentiment and ${riskScore}/100 risk from ${source}, the ${category} implications could affect ${entities.length > 0 ? entities[0].text + " and related stakeholders" : "relevant stakeholders"}. ${article.suggestedAction}`
      : `This ${category} article from ${source} matters because of its ${sentiment} sentiment and ${riskScore}/100 risk score. The coverage of "${headline}" could influence stakeholder perception and ${category} dynamics.`;
  }

  // Default contextual response
  return `Regarding "${headline}" from ${source}:\n\nThis is a ${category} article with ${sentiment} sentiment (${Math.round(article.sentiment.score * 100)}% confidence) and a risk score of ${riskScore}/100. ${summary ? `The key development: ${summary.substring(0, 150)}.` : ""}\n\nFeel free to ask me about the sentiment analysis, key entities, risk implications, or what to watch for regarding this article.`;
}

/* ─── POST Handler ───────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = String(body.message ?? "").trim();
    const article: ArticleContext | null = body.article ?? null;

    if (!message) {
      return NextResponse.json(
        { reply: "Please type a question about the article.", source: "mock" },
        { status: 200 },
      );
    }

    // Try Ollama first (local LLM) — fails gracefully if not running
    const ollamaReply = await callOllama(message, article);
    if (ollamaReply) {
      return NextResponse.json(
        { reply: ollamaReply, source: "ollama" },
        { status: 200 },
      );
    }

    // Fall back to mock responses
    const reply = generateMockResponse(message, article);

    // Simulate a small delay to feel more natural
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));

    return NextResponse.json(
      { reply, source: "mock" },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { reply: "Something went wrong. Please try again.", source: "error" },
      { status: 500 },
    );
  }
}
