import { NextResponse } from 'next/server';
import { Article } from '@/types/news';

const CATEGORY_IMAGES = {
  Technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
  Business: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
  Science: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
  Culture: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=600&q=80',
  Sports: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80',
  Global: 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&w=600&q=80'
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('query') || 'Technology';
  
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/intelligence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: [keyword], days: 5 })
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`);
    }

    const data = await response.json();
    
    // Convert backend scored_articles to frontend Article format
    const articles: Article[] = [];
    
    if (data.companyNews && Array.isArray(data.companyNews)) {
      data.companyNews.forEach((item: any, idx: number) => {
        const category = item.section === 'company' ? 'Business' : 'Technology';
        
        // Pick an image based on category
        const imageUrl = CATEGORY_IMAGES[category as keyof typeof CATEGORY_IMAGES] || CATEGORY_IMAGES.Technology;
        
        const urlOrHeadline = item.url || item.headline || `art-${idx}`;
        let hash = 0;
        for (let i = 0; i < urlOrHeadline.length; i++) {
          hash = (hash << 5) - hash + urlOrHeadline.charCodeAt(i);
          hash |= 0;
        }
        const articleId = `art-${Math.abs(hash)}`;

        articles.push({
          id: articleId,
          category: category,
          title: item.headline || 'Untitled Article',
          summary: item.snippet || '',
          keywordSummary: `Relevance score: ${item.relevanceScore}/100. Mentioned entities: ${[...(item.entities?.organizations || []), ...(item.entities?.people || [])].join(', ')}.`,
          whatHappened: [
            item.headline,
            item.snippet,
            `Reported by ${item.publication}`
          ],
          whyItMatters: [
            item.businessImpact || 'Ongoing monitoring required.',
            `Sentiment is predominantly ${item.sentiment}.`,
            `Source authority level: ${item.relevanceScore > 50 ? 'High' : 'Medium'}.`
          ],
          aiActions: [
            item.relevanceExplanation || 'Continue standard tracking.',
            'Monitor closely for updates.',
            'Cross-reference with related competitors.'
          ],
          imageUrl: imageUrl,
          imageAlt: item.headline,
          author: item.publication,
          publishedAt: item.date || 'Recent',
          readingTime: '3 min read',
          source: item.publication,
          sentiment: item.sentiment === 'positive' || item.sentiment === 'negative' ? item.sentiment : 'neutral',
          content: `<p class="mb-4">${item.fullContent || item.snippet}</p>`,
          aiNarrative: data.executiveBrief?.happened || 'AI Narrative processing...'
        });
      });
    }

    return NextResponse.json({ articles });
  } catch (error) {
    console.error('Failed to fetch from backend:', error);
    return NextResponse.json({ error: 'Failed to generate articles from backend API' }, { status: 500 });
  }
}
