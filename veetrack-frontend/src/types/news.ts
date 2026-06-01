export interface Article {
  id: string;
  category: string;
  title: string;
  summary: string;
  keywordSummary?: string;
  whatHappened: string[];
  whyItMatters: string[];
  aiActions: string[];
  imageUrl: string;
  imageAlt: string;
  author: string;
  publishedAt: string;
  readingTime: string;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  content: string;
  aiNarrative: string;
}
