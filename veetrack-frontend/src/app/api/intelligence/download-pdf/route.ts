import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";

/* ═══════════════════════════════════════════════════════════
   VEETRACK — PDF REPORT GENERATOR

   Accepts POST with IntelligenceReport JSON body.
   Generates a professional PDF report and returns it
   as a downloadable binary response.
   ═══════════════════════════════════════════════════════════ */

// ─── Types (matching keyword-store) ────────────────────────

interface ScoredArticle {
  headline: string;
  url: string;
  snippet: string;
  fullContent: string;
  publication: string;
  edition: string;
  date: string;
  section: "company" | "competition" | "industry";
  sentiment: "positive" | "negative" | "neutral";
  sentimentConfidence: number;
  sentimentReason: string;
  entities: { people: string[]; organizations: string[]; locations: string[] };
  sarcasmFlag: boolean;
  sarcasmReason: string;
  businessImpact: string;
  tone: string;
  keyQuote: string;
  relevanceScore: number;
  relevanceExplanation: string;
  isPriority: boolean;
}

interface IntelligenceReport {
  date: string;
  generatedAt: string;
  clientName: string;
  criticalAlerts: ScoredArticle[];
  priorityItems: ScoredArticle[];
  companyNews: ScoredArticle[];
  competitionNews: ScoredArticle[];
  industryNews: ScoredArticle[];
  executiveBrief: {
    happened: string;
    whyItMatters: string;
    recommendedAction: string;
    trendOutlook: string;
  };
  stats: {
    totalFound: number;
    afterRelevance: number;
    critical: number;
    priority: number;
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
    sourcesCount: number;
  };
  errors: string[];
}

// ─── Color Palette ────────────────────────────────────────

const COLORS = {
  darkBlue: "#1A1A2E",    // Primary dark for headers
  accentCyan: "#E63946",   // Primary accent (red — Way2News style)
  accentRed: "#DC2626",
  accentAmber: "#D97706",
  accentGreen: "#16A34A",
  white: "#FFFFFF",
  lightGray: "#F1F5F9",
  midGray: "#94A3B8",
  darkGray: "#475569",
  borderColor: "#E5E7EB",
  bgLightBlue: "#FEF2F2",   // Light red tint (matching accent)
  bgLightRed: "#FEF2F2",
  bgLightAmber: "#FFFBEB",
  bgLightGreen: "#F0FDF4",
  textDark: "#1A1A2E",
  textMedium: "#475569",
};

// ─── Helper: Truncate text ────────────────────────────────

function truncateText(text: string, maxLen: number): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + "...";
}

// ─── Helper: Draw a section header bar ────────────────────

function drawSectionHeader(
  doc: InstanceType<typeof PDFDocument>,
  title: string,
  y: number,
  color: string,
  icon?: string
): number {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;

  // Dark blue background bar
  doc.save();
  doc.rect(left, y, pageWidth, 32).fill(COLORS.darkBlue);

  // Title text (white, bold)
  const displayTitle = icon ? `${icon}  ${title}` : title;
  doc.font("Helvetica-Bold").fontSize(12).fillColor(COLORS.white);
  doc.text(displayTitle, left + 14, y + 9, { width: pageWidth - 28 });
  doc.restore();

  return y + 40;
}

// ─── Helper: Draw a single article block ──────────────────

function drawArticle(
  doc: InstanceType<typeof PDFDocument>,
  article: ScoredArticle,
  rank: number,
  y: number
): number {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;
  const bottomMargin = doc.page.margins.bottom;

  // Check if we need a new page (estimate article height ~120-180px)
  if (y + 160 > doc.page.height - bottomMargin) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  // Rank circle
  doc.save();
  doc.circle(left + 12, y + 10, 10).fill(COLORS.darkBlue);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.white);
  doc.text(String(rank), left + 12, y + 6, { width: 20, align: "center" });
  doc.restore();

  // Headline
  const headlineX = left + 30;
  const headlineWidth = pageWidth - 30;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.textDark);
  const headlineHeight = doc.heightOfString(article.headline, {
    width: headlineWidth - 80,
  });
  doc.text(article.headline, headlineX, y, {
    width: headlineWidth - 80,
    height: headlineHeight + 4,
  });

  // Score badge (right-aligned)
  const scoreText = `${article.relevanceScore}`;
  const scoreColor =
    article.relevanceScore >= 70
      ? COLORS.accentCyan
      : article.relevanceScore >= 50
        ? COLORS.accentAmber
        : COLORS.midGray;
  const scoreX = left + pageWidth - 45;
  doc.save();
  doc.roundedRect(scoreX, y, 40, 20, 4).fill(scoreColor);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.white);
  doc.text(scoreText, scoreX, y + 5, { width: 40, align: "center" });
  doc.restore();

  y += headlineHeight + 6;

  // Publication | Edition | Date
  const metaLine = `${article.publication}  |  ${article.edition}  |  ${article.date}`;
  doc.font("Helvetica").fontSize(8).fillColor(COLORS.midGray);
  doc.text(metaLine, headlineX, y, { width: headlineWidth - 20 });
  y += 14;

  // Sentiment + Section badges
  const sentimentColor =
    article.sentiment === "positive"
      ? COLORS.accentGreen
      : article.sentiment === "negative"
        ? COLORS.accentRed
        : COLORS.midGray;
  const sentimentLabel =
    article.sentiment.charAt(0).toUpperCase() + article.sentiment.slice(1);

  const sectionLabel =
    article.section.charAt(0).toUpperCase() + article.section.slice(1);
  const sectionColor =
    article.section === "company"
      ? COLORS.accentCyan
      : article.section === "competition"
        ? COLORS.accentRed
        : COLORS.accentAmber;

  // Sentiment pill
  doc.save();
  doc.roundedRect(headlineX, y, 60, 16, 3).fill(sentimentColor);
  doc.font("Helvetica-Bold").fontSize(7).fillColor(COLORS.white);
  doc.text(sentimentLabel, headlineX, y + 4, { width: 60, align: "center" });
  doc.restore();

  // Section pill
  doc.save();
  doc.roundedRect(headlineX + 66, y, 70, 16, 3).fill(sectionColor);
  doc.font("Helvetica-Bold").fontSize(7).fillColor(COLORS.white);
  doc.text(sectionLabel, headlineX + 66, y + 4, { width: 70, align: "center" });
  doc.restore();

  // Priority badge
  if (article.isPriority) {
    doc.save();
    doc.roundedRect(headlineX + 142, y, 55, 16, 3).fill(COLORS.accentAmber);
    doc.font("Helvetica-Bold").fontSize(7).fillColor(COLORS.white);
    doc.text("PRIORITY", headlineX + 142, y + 4, { width: 55, align: "center" });
    doc.restore();
  }

  y += 22;

  // Snippet
  if (article.snippet) {
    doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.textMedium);
    const snippetText = truncateText(article.snippet, 300);
    const snippetHeight = doc.heightOfString(snippetText, {
      width: headlineWidth - 10,
    });

    if (y + snippetHeight + 10 > doc.page.height - bottomMargin) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    doc.text(snippetText, headlineX, y, { width: headlineWidth - 10 });
    y += snippetHeight + 6;
  }

  // Business Impact (highlighted box)
  if (article.businessImpact) {
    if (y + 40 > doc.page.height - bottomMargin) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    const impactText = truncateText(article.businessImpact, 250);
    const impactHeight = doc.heightOfString(impactText, {
      width: headlineWidth - 30,
    });
    const boxHeight = impactHeight + 14;

    doc.save();
    doc.roundedRect(headlineX, y, headlineWidth - 10, boxHeight, 4).fill(COLORS.bgLightBlue);
    doc.restore();

    doc.font("Helvetica-Bold").fontSize(7).fillColor(COLORS.accentCyan);
    doc.text("BUSINESS IMPACT:", headlineX + 8, y + 5, { width: headlineWidth - 40 });
    doc.font("Helvetica").fontSize(8).fillColor("#1E40AF");
    doc.text(impactText, headlineX + 8, y + 16, { width: headlineWidth - 40 });

    y += boxHeight + 4;
  }

  // Key Quote
  if (article.keyQuote && article.keyQuote !== "N/A") {
    if (y + 30 > doc.page.height - bottomMargin) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    const quoteText = truncateText(article.keyQuote, 200);
    doc.font("Helvetica-Oblique").fontSize(8).fillColor(COLORS.darkGray);
    doc.text(`"${quoteText}"`, headlineX + 8, y, { width: headlineWidth - 30 });
    y += doc.heightOfString(`"${quoteText}"`, { width: headlineWidth - 30 }) + 6;
  }

  // Separator line
  if (y + 8 <= doc.page.height - bottomMargin) {
    doc.save();
    doc
      .moveTo(left, y)
      .lineTo(left + pageWidth, y)
      .strokeColor(COLORS.borderColor)
      .lineWidth(0.5)
      .stroke();
    doc.restore();
    y += 8;
  }

  return y;
}

// ─── Helper: Draw executive brief item ────────────────────

function drawBriefItem(
  doc: InstanceType<typeof PDFDocument>,
  label: string,
  content: string,
  y: number,
  bgColor: string,
  labelColor: string,
  contentColor: string
): number {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;
  const bottomMargin = doc.page.margins.bottom;

  const contentHeight = doc.heightOfString(content, { width: pageWidth - 30 });
  const boxHeight = contentHeight + 28;

  if (y + boxHeight > doc.page.height - bottomMargin) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  // Background box
  doc.save();
  doc.roundedRect(left, y, pageWidth, boxHeight, 6).fill(bgColor);
  doc.restore();

  // Label
  doc.font("Helvetica-Bold").fontSize(8).fillColor(labelColor);
  doc.text(label, left + 12, y + 8, { width: pageWidth - 24 });

  // Content
  doc.font("Helvetica").fontSize(9).fillColor(contentColor);
  doc.text(content, left + 12, y + 20, { width: pageWidth - 24 });

  return y + boxHeight + 8;
}

// ─── Main PDF Generator ───────────────────────────────────

function generatePDF(report: IntelligenceReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
      info: {
        Title: `VeeTrack Intelligence Report — ${report.date}`,
        Author: "VeeTrack AI",
        Subject: `Daily Intelligence Report for ${report.clientName}`,
        Creator: "VeeTrack 4-Agent Intelligence Pipeline",
      },
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    let y = doc.page.margins.top;

    /* ═══════════════════════════════════════════
       PAGE 1 — COVER PAGE
       ═══════════════════════════════════════════ */

    // Full dark blue background
    doc.save();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.darkBlue);
    doc.restore();

    // Top accent line
    doc.save();
    doc.rect(0, 0, doc.page.width, 4).fill(COLORS.accentCyan);
    doc.restore();

    // VeeTrack AI logo text
    y = 180;
    doc.font("Helvetica").fontSize(14).fillColor(COLORS.accentCyan);
    doc.text("VEETRACK AI", left, y, { width: pageWidth, align: "center" });

    // Decorative line
    y += 30;
    doc.save();
    const centerX = doc.page.width / 2;
    doc
      .moveTo(centerX - 80, y)
      .lineTo(centerX + 80, y)
      .strokeColor(COLORS.accentCyan)
      .lineWidth(1)
      .stroke();
    doc.restore();

    // Title
    y += 30;
    doc.font("Helvetica-Bold").fontSize(28).fillColor(COLORS.white);
    doc.text("DAILY INTELLIGENCE", left, y, { width: pageWidth, align: "center" });
    y += 36;
    doc.text("REPORT", left, y, { width: pageWidth, align: "center" });

    // Client name
    y += 50;
    doc.font("Helvetica").fontSize(14).fillColor(COLORS.accentCyan);
    doc.text(report.clientName, left, y, { width: pageWidth, align: "center" });

    // Date
    y += 30;
    doc.font("Helvetica").fontSize(12).fillColor("#CBD5E1");
    doc.text(report.date, left, y, { width: pageWidth, align: "center" });

    // Generated at
    y += 20;
    doc.font("Helvetica").fontSize(9).fillColor("#64748B");
    doc.text(`Generated at ${report.generatedAt}`, left, y, { width: pageWidth, align: "center" });

    // Stats summary
    y += 60;
    const statItems = [
      { label: "ARTICLES", value: String(report.stats.totalFound), color: COLORS.white },
      { label: "CRITICAL", value: String(report.stats.critical), color: COLORS.accentRed },
      { label: "PRIORITY", value: String(report.stats.priority), color: COLORS.accentAmber },
      { label: "SOURCES", value: String(report.stats.sourcesCount), color: COLORS.accentCyan },
    ];

    const statBoxWidth = 100;
    const totalStatsWidth = statItems.length * statBoxWidth + (statItems.length - 1) * 12;
    let statX = centerX - totalStatsWidth / 2;

    for (const stat of statItems) {
      doc.save();
      doc.roundedRect(statX, y, statBoxWidth, 50, 6)
        .fill("#0F2240")
        .stroke();
      doc.restore();

      doc.font("Helvetica-Bold").fontSize(20).fillColor(stat.color);
      doc.text(stat.value, statX, y + 8, { width: statBoxWidth, align: "center" });

      doc.font("Helvetica").fontSize(7).fillColor("#64748B");
      doc.text(stat.label, statX, y + 32, { width: statBoxWidth, align: "center" });

      statX += statBoxWidth + 12;
    }

    // Bottom branding
    const bottomY = doc.page.height - 80;
    doc.font("Helvetica").fontSize(8).fillColor("#475569");
    doc.text(
      "Powered by 4-Agent Intelligence Pipeline  |  Watcher  →  Context  →  Relevance  →  Alert",
      left,
      bottomY,
      { width: pageWidth, align: "center" }
    );

    doc.font("Helvetica").fontSize(7).fillColor("#334155");
    doc.text(
      "CONFIDENTIAL — For authorized recipients only",
      left,
      bottomY + 16,
      { width: pageWidth, align: "center" }
    );

    /* ═══════════════════════════════════════════
       PAGE 2 — EXECUTIVE BRIEF
       ═══════════════════════════════════════════ */

    doc.addPage();
    y = doc.page.margins.top;

    // Page header bar
    doc.save();
    doc.rect(0, 0, doc.page.width, 40).fill(COLORS.darkBlue);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.white);
    doc.text("VEETRACK AI  |  DAILY INTELLIGENCE REPORT", left + 14, 14, { width: pageWidth });
    doc.restore();

    y = 60;

    // Executive Brief section
    y = drawSectionHeader(doc, "EXECUTIVE BRIEF", y, COLORS.darkBlue, "⚡");

    // What happened
    y = drawBriefItem(
      doc,
      "WHAT HAPPENED TODAY",
      report.executiveBrief.happened,
      y,
      COLORS.lightGray,
      COLORS.textDark,
      COLORS.textMedium
    );

    // Why it matters
    y = drawBriefItem(
      doc,
      "WHY IT MATTERS",
      report.executiveBrief.whyItMatters,
      y,
      COLORS.bgLightBlue,
      "#1E40AF",
      "#1E3A5F"
    );

    // Recommended action
    y = drawBriefItem(
      doc,
      "RECOMMENDED ACTION",
      report.executiveBrief.recommendedAction,
      y,
      COLORS.bgLightGreen,
      "#166534",
      "#14532D"
    );

    // Trend outlook
    y = drawBriefItem(
      doc,
      "TREND OUTLOOK",
      report.executiveBrief.trendOutlook,
      y,
      COLORS.bgLightAmber,
      "#92400E",
      "#78350F"
    );

    // Sentiment breakdown
    y += 8;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.textDark);
    doc.text("SENTIMENT BREAKDOWN", left, y);
    y += 16;

    const sentItems = [
      { label: "Positive", value: report.stats.positiveCount, color: COLORS.accentGreen },
      { label: "Negative", value: report.stats.negativeCount, color: COLORS.accentRed },
      { label: "Neutral", value: report.stats.neutralCount, color: COLORS.midGray },
    ];

    const sentBoxWidth = 90;
    const totalSentWidth = sentItems.length * sentBoxWidth + (sentItems.length - 1) * 8;
    let sentX = left + (pageWidth - totalSentWidth) / 2;

    for (const item of sentItems) {
      doc.save();
      doc.roundedRect(sentX, y, sentBoxWidth, 28, 4).fill(item.color + "15");
      doc.restore();

      doc.font("Helvetica-Bold").fontSize(14).fillColor(item.color);
      doc.text(String(item.value), sentX, y + 3, { width: sentBoxWidth, align: "center" });

      doc.font("Helvetica").fontSize(7).fillColor(item.color);
      doc.text(item.label, sentX, y + 20, { width: sentBoxWidth, align: "center" });

      sentX += sentBoxWidth + 8;
    }

    /* ═══════════════════════════════════════════
       CRITICAL ALERTS SECTION
       ═══════════════════════════════════════════ */

    doc.addPage();
    y = doc.page.margins.top;

    // Page header bar
    doc.save();
    doc.rect(0, 0, doc.page.width, 40).fill(COLORS.darkBlue);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.white);
    doc.text("VEETRACK AI  |  DAILY INTELLIGENCE REPORT", left + 14, 14, { width: pageWidth });
    doc.restore();

    y = 60;

    y = drawSectionHeader(doc, "CRITICAL ALERTS", y, COLORS.darkBlue, "🚨");

    if (report.criticalAlerts.length > 0) {
      for (let i = 0; i < report.criticalAlerts.length; i++) {
        y = drawArticle(doc, report.criticalAlerts[i], i + 1, y);
      }
    } else {
      doc.font("Helvetica").fontSize(10).fillColor(COLORS.midGray);
      doc.text("No critical alerts today — all clear.", left + 14, y);
      y += 24;
    }

    /* ═══════════════════════════════════════════
       PRIORITY ITEMS SECTION
       ═══════════════════════════════════════════ */

    y += 16;
    y = drawSectionHeader(doc, "PRIORITY ITEMS", y, COLORS.darkBlue, "⚠");

    if (report.priorityItems.length > 0) {
      for (let i = 0; i < report.priorityItems.length; i++) {
        y = drawArticle(doc, report.priorityItems[i], i + 1, y);
      }
    } else {
      doc.font("Helvetica").fontSize(10).fillColor(COLORS.midGray);
      doc.text("No priority items today.", left + 14, y);
      y += 24;
    }

    /* ═══════════════════════════════════════════
       COMPANY NEWS — ZEE5 SECTION
       ═══════════════════════════════════════════ */

    doc.addPage();
    y = doc.page.margins.top;

    // Page header bar
    doc.save();
    doc.rect(0, 0, doc.page.width, 40).fill(COLORS.darkBlue);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.white);
    doc.text("VEETRACK AI  |  DAILY INTELLIGENCE REPORT", left + 14, 14, { width: pageWidth });
    doc.restore();

    y = 60;

    y = drawSectionHeader(doc, "COMPANY NEWS — ZEE5", y, COLORS.darkBlue, "🏢");

    if (report.companyNews.length > 0) {
      for (let i = 0; i < report.companyNews.length; i++) {
        y = drawArticle(doc, report.companyNews[i], i + 1, y);
      }
    } else {
      doc.font("Helvetica").fontSize(10).fillColor(COLORS.midGray);
      doc.text("No ZEE5 company coverage today.", left + 14, y);
      y += 24;
    }

    /* ═══════════════════════════════════════════
       COMPETITION NEWS SECTION
       ═══════════════════════════════════════════ */

    y += 16;
    y = drawSectionHeader(doc, "COMPETITION NEWS", y, COLORS.darkBlue, "⚔");

    if (report.competitionNews.length > 0) {
      for (let i = 0; i < report.competitionNews.length; i++) {
        y = drawArticle(doc, report.competitionNews[i], i + 1, y);
      }
    } else {
      doc.font("Helvetica").fontSize(10).fillColor(COLORS.midGray);
      doc.text("No competitor coverage today.", left + 14, y);
      y += 24;
    }

    /* ═══════════════════════════════════════════
       INDUSTRY NEWS SECTION
       ═══════════════════════════════════════════ */

    doc.addPage();
    y = doc.page.margins.top;

    // Page header bar
    doc.save();
    doc.rect(0, 0, doc.page.width, 40).fill(COLORS.darkBlue);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.white);
    doc.text("VEETRACK AI  |  DAILY INTELLIGENCE REPORT", left + 14, 14, { width: pageWidth });
    doc.restore();

    y = 60;

    y = drawSectionHeader(doc, "INDUSTRY NEWS", y, COLORS.darkBlue, "🌍");

    if (report.industryNews.length > 0) {
      for (let i = 0; i < report.industryNews.length; i++) {
        y = drawArticle(doc, report.industryNews[i], i + 1, y);
      }
    } else {
      doc.font("Helvetica").fontSize(10).fillColor(COLORS.midGray);
      doc.text("No industry coverage today.", left + 14, y);
      y += 24;
    }

    /* ═══════════════════════════════════════════
       FOOTER on every page
       ═══════════════════════════════════════════ */

    const totalPages = doc.bufferedPageRange();
    for (let i = 0; i < totalPages.count; i++) {
      doc.switchToPage(i);

      // Skip footer on cover page (page 0)
      if (i === 0) continue;

      // Footer line
      const footerY = doc.page.height - 35;
      doc.save();
      doc
        .moveTo(left, footerY)
        .lineTo(left + pageWidth, footerY)
        .strokeColor(COLORS.borderColor)
        .lineWidth(0.5)
        .stroke();
      doc.restore();

      doc.font("Helvetica").fontSize(7).fillColor(COLORS.midGray);
      doc.text(
        `VeeTrack AI  |  Daily Intelligence Report  |  ${report.date}  |  Page ${i + 1} of ${totalPages.count}`,
        left,
        footerY + 6,
        { width: pageWidth, align: "center" }
      );
    }

    doc.end();
  });
}

// ─── Route Handler ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !body.date) {
      return NextResponse.json(
        { error: "Invalid request: IntelligenceReport body is required" },
        { status: 400 }
      );
    }

    const report = body as IntelligenceReport;

    // Generate PDF
    const pdfBuffer = await generatePDF(report);

    // Return PDF as downloadable response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="VeeTrack-Intelligence-Report.pdf"',
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "PDF generation failed";
    console.error("[download-pdf] Error:", message);
    return NextResponse.json(
      { error: "PDF generation failed", details: message },
      { status: 500 }
    );
  }
}
