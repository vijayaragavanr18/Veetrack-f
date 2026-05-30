import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  PageBreak,
  TabStopPosition,
  TabStopType,
  TableLayoutType,
  convertInchesToTwip,
} from "docx";

/* ═══════════════════════════════════════════════════════════
   VEETRACK — DOCX Intelligence Report Generator
   
   Accepts POST with IntelligenceReport JSON body,
   generates a professional DOCX document, and returns
   it as a downloadable binary response.
   ═══════════════════════════════════════════════════════════ */

// ─── Types ────────────────────────────────────────────────

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

// ─── Color Constants ──────────────────────────────────────

const DARK_BLUE = "1B2A4A";
const MEDIUM_BLUE = "2C4A7C";
const LIGHT_BLUE_BG = "E8EDF5";
const RED_ALERT = "C0392B";
const RED_BG = "FDEDEC";
const ORANGE_WARN = "E67E22";
const ORANGE_BG = "FEF5E7";
const GREEN_POS = "27AE60";
const GREEN_BG = "EAFAF1";
const GRAY_NEUTRAL = "7F8C8D";
const GRAY_BG = "F2F3F4";
const TABLE_HEADER_BG = "1B2A4A";
const TABLE_ALT_ROW_BG = "F7F9FC";
const BORDER_GRAY = "BDC3C7";
const DARK_TEXT = "2C3E50";
const SUBTLE_TEXT = "7F8C8D";

// ─── Helper: Create a section header paragraph ────────────

function sectionHeader(text: string, emoji?: string): Paragraph {
  return new Paragraph({
    spacing: { before: 400, after: 200 },
    border: {
      bottom: { color: DARK_BLUE, space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [
      ...(emoji ? [new TextRun({ text: `${emoji}  `, size: 32, font: "Segoe UI Emoji" })] : []),
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 28,
        color: DARK_BLUE,
        font: "Calibri",
      }),
    ],
  });
}

// ─── Helper: Sub-section header ───────────────────────────

function subHeader(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 22,
        color: MEDIUM_BLUE,
        font: "Calibri",
      }),
    ],
  });
}

// ─── Helper: Body text paragraph ──────────────────────────

function bodyText(text: string, options?: { bold?: boolean; italic?: boolean; color?: string; size?: number }): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({
        text,
        bold: options?.bold ?? false,
        italics: options?.italic ?? false,
        color: options?.color ?? DARK_TEXT,
        size: options?.size ?? 20,
        font: "Calibri",
      }),
    ],
  });
}

// ─── Helper: Label + Value pair on one line ───────────────

function labelValue(label: string, value: string, labelColor?: string): Paragraph {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
        size: 20,
        color: labelColor ?? MEDIUM_BLUE,
        font: "Calibri",
      }),
      new TextRun({
        text: value,
        size: 20,
        color: DARK_TEXT,
        font: "Calibri",
      }),
    ],
  });
}

// ─── Helper: Sentiment color ──────────────────────────────

function sentimentColor(sentiment: string): string {
  switch (sentiment) {
    case "positive": return GREEN_POS;
    case "negative": return RED_ALERT;
    default: return GRAY_NEUTRAL;
  }
}

function sentimentBg(sentiment: string): string {
  switch (sentiment) {
    case "positive": return GREEN_BG;
    case "negative": return RED_BG;
    default: return GRAY_BG;
  }
}

// ─── Helper: Create article table rows ────────────────────

function createArticleRows(articles: ScoredArticle[]): TableRow[] {
  const rows: TableRow[] = [];

  // Table header row
  rows.push(
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "DATE", bold: true, color: "FFFFFF", size: 18, font: "Calibri" })],
          })],
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR },
          children: [new Paragraph({
            children: [new TextRun({ text: "HEADLINE", bold: true, color: "FFFFFF", size: 18, font: "Calibri" })],
          })],
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR },
          children: [new Paragraph({
            children: [new TextRun({ text: "PUBLICATION", bold: true, color: "FFFFFF", size: 18, font: "Calibri" })],
          })],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "EDITION", bold: true, color: "FFFFFF", size: 18, font: "Calibri" })],
          })],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "SCORE", bold: true, color: "FFFFFF", size: 18, font: "Calibri" })],
          })],
        }),
      ],
    })
  );

  // Article rows
  articles.forEach((article, idx) => {
    const isAlt = idx % 2 === 1;
    const rowBg = isAlt ? TABLE_ALT_ROW_BG : "FFFFFF";
    const sColor = sentimentColor(article.sentiment);

    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: rowBg, type: ShadingType.CLEAR },
            verticalAlign: "center",
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: article.date, size: 17, color: DARK_TEXT, font: "Calibri" })],
            })],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: rowBg, type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 20 },
                children: [new TextRun({ text: article.headline, bold: true, size: 18, color: DARK_TEXT, font: "Calibri" })],
              }),
              // Snippet
              ...(article.snippet
                ? [new Paragraph({
                    spacing: { before: 20, after: 20 },
                    children: [new TextRun({
                      text: article.snippet.length > 200 ? article.snippet.substring(0, 200) + "..." : article.snippet,
                      size: 16,
                      color: SUBTLE_TEXT,
                      font: "Calibri",
                      italics: true,
                    })],
                  })]
                : []),
              // Sentiment + Score inline
              new Paragraph({
                spacing: { before: 20, after: 10 },
                children: [
                  new TextRun({ text: "Sentiment: ", bold: true, size: 16, color: SUBTLE_TEXT, font: "Calibri" }),
                  new TextRun({ text: article.sentiment.toUpperCase(), bold: true, size: 16, color: sColor, font: "Calibri" }),
                  new TextRun({ text: ` (${(article.sentimentConfidence * 100).toFixed(0)}%)`, size: 16, color: SUBTLE_TEXT, font: "Calibri" }),
                  new TextRun({ text: "   |   ", size: 16, color: BORDER_GRAY, font: "Calibri" }),
                  new TextRun({ text: "Relevance: ", bold: true, size: 16, color: SUBTLE_TEXT, font: "Calibri" }),
                  new TextRun({ text: `${article.relevanceScore}/100`, bold: true, size: 16, color: article.relevanceScore >= 80 ? RED_ALERT : article.relevanceScore >= 70 ? ORANGE_WARN : MEDIUM_BLUE, font: "Calibri" }),
                  ...(article.sarcasmFlag
                    ? [
                        new TextRun({ text: "   |   ", size: 16, color: BORDER_GRAY, font: "Calibri" }),
                        new TextRun({ text: "⚠ SARCASM", bold: true, size: 16, color: ORANGE_WARN, font: "Calibri" }),
                      ]
                    : []),
                ],
              }),
              // Business Impact
              ...(article.businessImpact
                ? [new Paragraph({
                    spacing: { before: 10, after: 10 },
                    children: [
                      new TextRun({ text: "Business Impact: ", bold: true, size: 16, color: MEDIUM_BLUE, font: "Calibri" }),
                      new TextRun({ text: article.businessImpact, size: 16, color: DARK_TEXT, font: "Calibri" }),
                    ],
                  })]
                : []),
              // Key Quote
              ...(article.keyQuote && article.keyQuote !== "N/A"
                ? [new Paragraph({
                    spacing: { before: 10, after: 10 },
                    children: [
                      new TextRun({ text: "Key Quote: ", bold: true, size: 16, color: MEDIUM_BLUE, font: "Calibri" }),
                      new TextRun({ text: `"${article.keyQuote}"`, size: 16, color: DARK_TEXT, font: "Calibri", italics: true }),
                    ],
                  })]
                : []),
              // URL
              new Paragraph({
                spacing: { before: 10, after: 40 },
                children: [
                  new TextRun({ text: "Source: ", bold: true, size: 15, color: SUBTLE_TEXT, font: "Calibri" }),
                  new TextRun({ text: article.url, size: 15, color: MEDIUM_BLUE, font: "Calibri" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 18, type: WidthType.PERCENTAGE },
            shading: { fill: rowBg, type: ShadingType.CLEAR },
            verticalAlign: "center",
            children: [new Paragraph({
              children: [new TextRun({ text: article.publication, size: 17, color: DARK_TEXT, font: "Calibri" })],
            })],
          }),
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { fill: rowBg, type: ShadingType.CLEAR },
            verticalAlign: "center",
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: article.edition, size: 17, color: SUBTLE_TEXT, font: "Calibri" })],
            })],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: rowBg, type: ShadingType.CLEAR },
            verticalAlign: "center",
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({
                  text: `${article.relevanceScore}`,
                  bold: true,
                  size: 22,
                  color: article.relevanceScore >= 80 ? RED_ALERT : article.relevanceScore >= 70 ? ORANGE_WARN : DARK_TEXT,
                  font: "Calibri",
                })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({
                  text: article.sentiment.toUpperCase(),
                  bold: true,
                  size: 14,
                  color: sColor,
                  font: "Calibri",
                })],
              }),
            ],
          }),
        ],
      })
    );
  });

  return rows;
}

// ─── Helper: Build article section with table ─────────────

function buildArticleSection(
  title: string,
  emoji: string,
  articles: ScoredArticle[]
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(sectionHeader(title, emoji));

  if (articles.length === 0) {
    paragraphs.push(bodyText("No articles in this section.", { italic: true, color: SUBTLE_TEXT }));
    return paragraphs;
  }

  paragraphs.push(bodyText(`${articles.length} article${articles.length > 1 ? "s" : ""}`, { color: SUBTLE_TEXT, size: 18 }));

  // Create table
  const tableRows = createArticleRows(articles);

  paragraphs.push(
    new Paragraph({
      children: [
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
        }),
      ],
    })
  );

  return paragraphs;
}

// ─── Build Executive Brief Section ────────────────────────

function buildExecutiveBrief(brief: IntelligenceReport["executiveBrief"]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(sectionHeader("EXECUTIVE BRIEF", "📋"));

  // What Happened
  paragraphs.push(subHeader("What Happened"));
  paragraphs.push(bodyText(brief.happened));

  // Why It Matters
  paragraphs.push(subHeader("Why It Matters"));
  paragraphs.push(bodyText(brief.whyItMatters));

  // Recommended Action
  paragraphs.push(subHeader("Recommended Action"));
  paragraphs.push(bodyText(brief.recommendedAction));

  // Trend Outlook
  paragraphs.push(subHeader("Trend Outlook"));
  paragraphs.push(bodyText(brief.trendOutlook));

  return paragraphs;
}

// ─── Build Stats Summary Section ──────────────────────────

function buildStatsSection(stats: IntelligenceReport["stats"]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(sectionHeader("STATISTICS SUMMARY", "📊"));

  // Stats table
  const statsData: [string, string | number][] = [
    ["Total Articles Found", stats.totalFound],
    ["After Relevance Filter", stats.afterRelevance],
    ["Critical Alerts", stats.critical],
    ["Priority Items", stats.priority],
    ["Positive Sentiment", stats.positiveCount],
    ["Negative Sentiment", stats.negativeCount],
    ["Neutral Sentiment", stats.neutralCount],
    ["Unique Sources", stats.sourcesCount],
  ];

  const statsRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 60, type: WidthType.PERCENTAGE },
          shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR },
          children: [new Paragraph({
            children: [new TextRun({ text: "METRIC", bold: true, color: "FFFFFF", size: 20, font: "Calibri" })],
          })],
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "VALUE", bold: true, color: "FFFFFF", size: 20, font: "Calibri" })],
          })],
        }),
      ],
    }),
    ...statsData.map(([metric, value], idx) => {
      const bg = idx % 2 === 1 ? TABLE_ALT_ROW_BG : "FFFFFF";
      return new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            shading: { fill: bg, type: ShadingType.CLEAR },
            children: [new Paragraph({
              children: [new TextRun({ text: metric, size: 20, color: DARK_TEXT, font: "Calibri" })],
            })],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: bg, type: ShadingType.CLEAR },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: String(value),
                bold: true,
                size: 22,
                color: metric === "Critical Alerts" && Number(value) > 0
                  ? RED_ALERT
                  : metric === "Priority Items" && Number(value) > 0
                    ? ORANGE_WARN
                    : DARK_TEXT,
                font: "Calibri",
              })],
            })],
          }),
        ],
      });
    }),
  ];

  paragraphs.push(
    new Paragraph({
      children: [
        new Table({
          rows: statsRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
        }),
      ],
    })
  );

  return paragraphs;
}

// ─── Build Title Page ─────────────────────────────────────

function buildTitlePage(report: IntelligenceReport): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Spacer
  for (let i = 0; i < 6; i++) {
    paragraphs.push(new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }));
  }

  // Top accent line
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: {
        bottom: { color: DARK_BLUE, space: 1, style: BorderStyle.SINGLE, size: 12 },
      },
      spacing: { after: 300 },
      children: [],
    })
  );

  // Title
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 100 },
      children: [
        new TextRun({
          text: "DAILY INTELLIGENCE",
          bold: true,
          size: 56,
          color: DARK_BLUE,
          font: "Calibri",
        }),
      ],
    })
  );

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({
          text: "REPORT",
          bold: true,
          size: 56,
          color: DARK_BLUE,
          font: "Calibri",
        }),
      ],
    })
  );

  // Bottom accent line
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: {
        bottom: { color: DARK_BLUE, space: 1, style: BorderStyle.SINGLE, size: 12 },
      },
      spacing: { after: 400 },
      children: [],
    })
  );

  // Client name
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 100 },
      children: [
        new TextRun({
          text: "Prepared for",
          size: 24,
          color: SUBTLE_TEXT,
          font: "Calibri",
        }),
      ],
    })
  );

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({
          text: report.clientName,
          bold: true,
          size: 36,
          color: DARK_BLUE,
          font: "Calibri",
        }),
      ],
    })
  );

  // Date
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 60 },
      children: [
        new TextRun({
          text: report.date,
          size: 26,
          color: DARK_TEXT,
          font: "Calibri",
        }),
      ],
    })
  );

  // Generated at
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({
          text: `Generated at ${report.generatedAt}`,
          size: 20,
          color: SUBTLE_TEXT,
          font: "Calibri",
        }),
      ],
    })
  );

  // Generated by
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: "Generated by VeeTrack AI",
          italics: true,
          size: 22,
          color: MEDIUM_BLUE,
          font: "Calibri",
        }),
      ],
    })
  );

  // Confidentiality notice
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 100 },
      children: [
        new TextRun({
          text: "CONFIDENTIAL — For Authorized Personnel Only",
          bold: true,
          size: 16,
          color: RED_ALERT,
          font: "Calibri",
        }),
      ],
    })
  );

  // Page break after title page
  paragraphs.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  return paragraphs;
}

// ─── Build Critical Alert Banner ──────────────────────────

function buildCriticalAlertBanner(articles: ScoredArticle[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  if (articles.length === 0) return paragraphs;

  paragraphs.push(
    new Paragraph({
      spacing: { before: 200, after: 100 },
      shading: { fill: RED_BG, type: ShadingType.CLEAR },
      border: {
        left: { color: RED_ALERT, space: 1, style: BorderStyle.SINGLE, size: 18 },
      },
      children: [
        new TextRun({ text: "  🚨  ", size: 28, font: "Segoe UI Emoji" }),
        new TextRun({
          text: `CRITICAL ALERTS: ${articles.length} ITEM${articles.length > 1 ? "S" : ""} REQUIRE IMMEDIATE ATTENTION`,
          bold: true,
          size: 24,
          color: RED_ALERT,
          font: "Calibri",
        }),
      ],
    })
  );

  // Brief summary of each critical alert
  articles.forEach((article) => {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 80, after: 80 },
        indent: { left: convertInchesToTwip(0.3) },
        border: {
          left: { color: RED_ALERT, space: 1, style: BorderStyle.SINGLE, size: 6 },
        },
        children: [
          new TextRun({ text: "⚠ ", size: 18, font: "Segoe UI Emoji", color: RED_ALERT }),
          new TextRun({ text: article.headline, bold: true, size: 18, color: RED_ALERT, font: "Calibri" }),
          new TextRun({ text: ` — ${article.businessImpact}`, size: 18, color: DARK_TEXT, font: "Calibri" }),
        ],
      })
    );
  });

  return paragraphs;
}

// ─── Main: Generate Document ──────────────────────────────

async function generateDocument(report: IntelligenceReport): Promise<Buffer> {
  const allParagraphs: Paragraph[] = [];

  // Title Page
  allParagraphs.push(...buildTitlePage(report));

  // Critical Alert Banner (before executive brief)
  allParagraphs.push(...buildCriticalAlertBanner(report.criticalAlerts));

  // Executive Brief
  allParagraphs.push(...buildExecutiveBrief(report.executiveBrief));

  // Critical Alerts (full detail)
  allParagraphs.push(...buildArticleSection("Critical Alerts", "🚨", report.criticalAlerts));

  // Priority Items
  allParagraphs.push(...buildArticleSection("Priority Items", "⚡", report.priorityItems));

  // Company News
  allParagraphs.push(...buildArticleSection("Company News — ZEE5", "🏢", report.companyNews));

  // Competition News
  allParagraphs.push(...buildArticleSection("Competition News", "🏆", report.competitionNews));

  // Industry News
  allParagraphs.push(...buildArticleSection("Industry News", "🌐", report.industryNews));

  // Stats Summary
  allParagraphs.push(...buildStatsSection(report.stats));

  // Footer disclaimer
  allParagraphs.push(
    new Paragraph({ spacing: { before: 600, after: 100 }, children: [] })
  );
  allParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: {
        top: { color: BORDER_GRAY, space: 1, style: BorderStyle.SINGLE, size: 4 },
      },
      spacing: { before: 200, after: 60 },
      children: [
        new TextRun({
          text: "This report was generated by VeeTrack AI — an automated media intelligence system.",
          italics: true,
          size: 16,
          color: SUBTLE_TEXT,
          font: "Calibri",
        }),
      ],
    })
  );
  allParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({
          text: "All scores are AI-generated and should be verified by analysts before external distribution.",
          italics: true,
          size: 16,
          color: SUBTLE_TEXT,
          font: "Calibri",
        }),
      ],
    })
  );

  // Create the document
  const doc = new Document({
    creator: "VeeTrack AI",
    title: `Daily Intelligence Report — ${report.date}`,
    description: `Media intelligence report for ${report.clientName}`,
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 20,
            color: DARK_TEXT,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.8),
            },
          },
        },
        children: allParagraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

// ─── API Route Handler ────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid request body — expected IntelligenceReport JSON" },
        { status: 400 }
      );
    }

    // Validate required fields
    const report = body as IntelligenceReport;
    if (!report.date || !report.clientName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: date, clientName" },
        { status: 400 }
      );
    }

    // Ensure arrays exist
    report.criticalAlerts = report.criticalAlerts || [];
    report.priorityItems = report.priorityItems || [];
    report.companyNews = report.companyNews || [];
    report.competitionNews = report.competitionNews || [];
    report.industryNews = report.industryNews || [];
    report.errors = report.errors || [];
    report.executiveBrief = report.executiveBrief || {
      happened: "",
      whyItMatters: "",
      recommendedAction: "",
      trendOutlook: "",
    };
    report.stats = report.stats || {
      totalFound: 0,
      afterRelevance: 0,
      critical: 0,
      priority: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      sourcesCount: 0,
    };

    // Generate DOCX
    const docxBuffer = await generateDocument(report);

    // Return as downloadable response
    const dateSlug = report.date.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const filename = `VeeTrack-Intelligence-Report-${dateSlug}.docx`;

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(docxBuffer.length),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DOCX generation failed";
    console.error("[download-docx] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
