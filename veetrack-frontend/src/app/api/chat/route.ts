import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { articleTitle, articleContent, question, history } = await request.json();
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    // Create session
    const startResp = await fetch(`${backendUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article_title: articleTitle,
        article_text: articleContent,
        article_url: ""
      })
    });
    
    if (!startResp.ok) {
      throw new Error(`Backend start chat failed: ${startResp.status}`);
    }

    const { session_id } = await startResp.json();
    
    const fullQuestion = history && history.length > 0 
      ? `Previous Context:\n${history.map((h: any) => `${h.role}: ${h.text}`).join('\n')}\n\nNew Question: ${question}`
      : question;

    // Ask question
    const askResp = await fetch(`${backendUrl}/api/chat/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session_id,
        question: fullQuestion
      })
    });
    
    if (!askResp.ok) {
      throw new Error(`Backend ask chat failed: ${askResp.status}`);
    }

    const { answer } = await askResp.json();
    
    // End session (fire and forget)
    fetch(`${backendUrl}/api/chat?session_id=${session_id}`, {
      method: 'DELETE'
    }).catch(e => console.error("Failed to delete session", e));
    
    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
