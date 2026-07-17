import React from 'react';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  ExternalLink, 
  Sparkles, 
  AlertCircle, 
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  HelpCircle
} from 'lucide-react';

// Custom modern X (formerly Twitter) SVG icon
const XIcon = ({ size = 11, className = "" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className} 
    width={size} 
    height={size}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const SocialImpactDashboard = ({ data, isLoading, keyword }) => {
  if (isLoading) {
    return (
      <div className="w-full max-w-[450px] md:max-w-[650px] h-full flex flex-col justify-start px-6 pt-6 overflow-y-auto pb-8 animate-pulse">
        {/* Loading Header */}
        <div className="h-8 bg-surface-container-high rounded w-3/4 mb-4" />
        <div className="h-4 bg-surface-container rounded w-1/2 mb-8" />
        
        {/* Loading Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="h-32 bg-surface-container rounded-lg" />
          <div className="h-32 bg-surface-container rounded-lg" />
        </div>
        
        {/* Loading AI Brief */}
        <div className="h-40 bg-surface-container rounded-lg mb-6" />
        
        {/* Loading Posts */}
        <div className="space-y-4">
          <div className="h-20 bg-surface-container rounded-lg" />
          <div className="h-20 bg-surface-container rounded-lg" />
          <div className="h-20 bg-surface-container rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="w-full max-w-[450px] h-full flex flex-col items-center justify-center px-8 text-center select-none">
        <div className="w-16 h-16 bg-surface-container border border-outline-variant/20 rounded-full flex items-center justify-center text-on-surface-variant/40 mb-4">
          <AlertCircle size={28} />
        </div>
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">No Social Data</h2>
        <p className="text-on-surface-variant text-body-md leading-relaxed">
          {data?.error || "We couldn't retrieve social media metrics for this keyword. Please configure your APIDIRECT_API_KEY in the backend .env or search for another topic."}
        </p>
      </div>
    );
  }

  const { 
    impactScore = 0, 
    impactTier = 'None', 
    totalMentions = 0, 
    sentimentBreakdown = { positive: 0, negative: 0, neutral: 0 }, 
    summary = '', 
    posts = [] 
  } = data;

  const totalSentiment = sentimentBreakdown.positive + sentimentBreakdown.negative + sentimentBreakdown.neutral || 1;
  const posPercent = Math.round((sentimentBreakdown.positive / totalSentiment) * 100);
  const negPercent = Math.round((sentimentBreakdown.negative / totalSentiment) * 100);
  const neuPercent = Math.round((sentimentBreakdown.neutral / totalSentiment) * 100);

  // SVG parameters for circular indicator
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (impactScore / 100) * circumference;

  // Determine Tier colors
  const getTierStyles = (tier) => {
    switch (tier.toLowerCase()) {
      case 'critical/viral high':
        return 'bg-gradient-to-r from-rose-500/10 to-pink-500/10 border-rose-500/30 text-rose-500 shadow-rose-500/5';
      case 'high':
        return 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-500 shadow-amber-500/5';
      case 'medium':
        return 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30 text-blue-500 shadow-blue-500/5';
      default:
        return 'bg-gradient-to-r from-slate-500/10 to-emerald-500/10 border-slate-500/30 text-slate-500 shadow-slate-500/5';
    }
  };

  return (
    <div className="w-full max-w-[450px] md:max-w-[650px] h-full flex flex-col justify-start px-6 pt-6 overflow-y-auto pb-24 scrollbar-thin select-none">
      
      {/* Title & Header */}
      <div className="mb-6">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-1 flex items-center gap-2">
          <TrendingUp className="text-primary-container" size={24} />
          Social Impact Analytics
        </h2>
        <p className="text-on-surface-variant text-body-md">
          Real-time tracking of public sentiment, influence, and viral trends for <span className="font-semibold text-primary">"{keyword}"</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        
        {/* Card 1: Impact Score Speedometer */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-primary-container/30 transition-all duration-300">
          <div className="flex flex-col justify-between h-full">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant/60 block mb-1">Impact Score</span>
              <span className="text-3xl font-extrabold text-on-surface tracking-tight">{impactScore}</span>
              <span className="text-on-surface-variant/40 text-[12px] font-medium ml-1">/100</span>
            </div>
            
            <div className={`mt-3 px-3 py-1 border rounded-lg text-[11px] font-semibold uppercase tracking-wider ${getTierStyles(impactTier)}`}>
              {impactTier}
            </div>
          </div>

          {/* Glowing Radial Meter */}
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-surface-container-highest"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-primary transition-all duration-1000 ease-out"
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-body-md font-bold text-on-surface">{Math.round(impactScore)}%</span>
              <span className="text-[8px] font-semibold text-on-surface-variant/40 uppercase tracking-widest">Score</span>
            </div>
          </div>
        </div>

        {/* Card 2: Mentions & Sentiment Breakdown */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-primary-container/30 transition-all duration-300">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant/60">Mentions Volumetrics</span>
              <div className="flex items-center gap-1 text-[11px] font-bold text-primary">
                <Users size={12} />
                <span>{totalMentions} threads</span>
              </div>
            </div>
            
            {/* Percentages bar */}
            <div className="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden flex mb-3.5 mt-2">
              {sentimentBreakdown.positive > 0 && (
                <div style={{ width: `${posPercent}%` }} className="bg-emerald-500 h-full" title={`Positive: ${posPercent}%`} />
              )}
              {sentimentBreakdown.neutral > 0 && (
                <div style={{ width: `${neuPercent}%` }} className="bg-sky-500 h-full" title={`Neutral: ${neuPercent}%`} />
              )}
              {sentimentBreakdown.negative > 0 && (
                <div style={{ width: `${negPercent}%` }} className="bg-rose-500 h-full" title={`Negative: ${negPercent}%`} />
              )}
            </div>
          </div>

          {/* Legened Grid */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold text-on-surface-variant">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded py-1 px-1 text-emerald-600 flex items-center justify-center gap-1">
              <ThumbsUp size={10} />
              <span>{posPercent}%</span>
            </div>
            <div className="bg-sky-500/10 border border-sky-500/20 rounded py-1 px-1 text-sky-600 flex items-center justify-center gap-1">
              <HelpCircle size={10} />
              <span>{neuPercent}%</span>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded py-1 px-1 text-rose-600 flex items-center justify-center gap-1">
              <ThumbsDown size={10} />
              <span>{negPercent}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* AI Intelligence Brief */}
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-5 shadow-sm mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 text-primary-container/10">
          <Sparkles size={40} className="animate-pulse" />
        </div>
        <h3 className="font-label-md text-label-md text-primary-container uppercase tracking-widest mb-3 flex items-center gap-1.5 font-bold">
          <Sparkles size={14} />
          AI Analyst Report
        </h3>
        <p className="font-body-lg text-body-md text-on-surface-variant leading-relaxed text-justify whitespace-pre-line select-text">
          {summary || "Generating intelligence analysis report..."}
        </p>
      </div>

      {/* Recent Social Mentions List */}
      <div className="mb-4">
        <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-widest mb-3.5 flex items-center gap-1.5 font-bold">
          <BarChart3 size={14} className="text-primary-container" />
          Recent Social Mentions ({posts.length})
        </h3>
        
        <div className="space-y-3">
          {posts.map((post, idx) => {
            const isTwitter = post.platform === 'twitter';
            const isPositive = post.sentiment === 'positive';
            const isNegative = post.sentiment === 'negative';
            
            return (
              <div 
                key={idx}
                className="bg-surface-container border border-outline-variant/20 hover:border-outline-variant rounded-xl p-4 transition-all duration-200 select-text flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-2.5 select-none">
                    
                    {/* Platform Badge */}
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg flex items-center justify-center ${isTwitter ? 'bg-black text-white' : 'bg-orange-500 text-white'}`}>
                        {isTwitter ? <XIcon size={11} className="text-white" /> : <MessageSquare size={11} />}
                      </div>
                      <span className="text-[11px] font-bold text-on-surface-variant/80">
                        {isTwitter ? 'X/Twitter' : 'Reddit'} • @{post.author}
                      </span>
                    </div>

                    {/* Sentiment Label Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold border flex items-center gap-1 ${
                      isPositive 
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600' 
                        : isNegative 
                          ? 'bg-rose-500/10 border-rose-500/25 text-rose-600' 
                          : 'bg-sky-500/10 border-sky-500/25 text-sky-600'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${isPositive ? 'bg-emerald-500' : isNegative ? 'bg-rose-500' : 'bg-sky-500'}`} />
                      {post.sentiment}
                    </span>
                  </div>

                  {/* Post Content */}
                  {post.title && post.title !== post.content && (
                    <h4 className="text-body-md font-bold text-on-surface mb-1 select-text">
                      {post.title}
                    </h4>
                  )}
                  <p className="text-[12px] text-on-surface-variant/90 leading-relaxed select-text">
                    {post.content}
                  </p>
                </div>

                {/* External Link Footer */}
                {post.url && (
                  <div className="mt-3 pt-2 border-t border-outline-variant/10 flex justify-between items-center select-none">
                    <span className="text-[10px] text-on-surface-variant/30 font-medium">
                      {post.published_at ? new Date(post.published_at).toLocaleString() : 'Recent'}
                    </span>
                    <a 
                      href={post.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[10px] text-primary hover:text-primary-container font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      View Source
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
};
