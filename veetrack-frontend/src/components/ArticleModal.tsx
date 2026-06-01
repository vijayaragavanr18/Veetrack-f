'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, ArrowLeft, Clock, Calendar, User, Bookmark } from 'lucide-react';
import { Article } from '@/types/news';

interface ArticleModalProps {
  article: Article | null;
  isOpen: boolean;
  onClose: () => void;
  isSaved?: boolean;
  onToggleSave?: (articleId: string) => void;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({
  article,
  isOpen,
  onClose,
  isSaved = false,
  onToggleSave,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Track scroll progress inside modal
  const handleScroll = () => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const totalHeight = element.scrollHeight - element.clientHeight;
    if (totalHeight === 0) {
      setScrollProgress(0);
      return;
    }

    const currentScroll = element.scrollTop;
    setScrollProgress((currentScroll / totalHeight) * 100);
  };

  if (!article || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl transition-all duration-300">
      {/* Top Reading Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-surface-container-highest z-50">
        <div
          className="h-full bg-primary-container transition-all duration-75"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Main Container */}
      <div className="w-full h-full max-w-[680px] flex flex-col relative bg-surface border-x border-outline-variant/30 md:border-outline-variant shadow-2xl">
        {/* Modal Sticky Header */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-outline-variant/20 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer select-none text-label-md font-semibold"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          
          <div className="text-label-sm uppercase tracking-widest text-primary-container font-bold border border-primary-container/30 px-3 py-0.5 rounded-full bg-primary-container/5">
            {article.category}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => article && onToggleSave?.(article.id)}
              aria-label={isSaved ? 'Unsave article' : 'Save article'}
              className={`flex items-center justify-center p-2 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer ${
                isSaved ? 'text-primary-container' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-on-surface-variant hover:text-primary flex items-center justify-center p-2 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Scrollable Article Content */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-8 scrollbar-thin scrollbar-thumb-surface-container-highest scrollbar-track-transparent"
        >
          {/* Header Area */}
          <div className="mb-6">
            <h1 className="font-headline-lg text-headline-lg text-on-surface leading-tight mb-4">
              {article.title}
            </h1>

            {/* Metadata bar */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-label-sm text-on-surface-variant/80 border-y border-outline-variant/10 py-3 mb-6">
              <div className="flex items-center gap-1.5">
                <User size={14} className="text-primary-container" />
                <span className="font-semibold text-on-surface">{article.author}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>{article.publishedAt}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>{article.readingTime}</span>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="w-full h-[240px] md:h-[340px] relative overflow-hidden rounded mb-8 border border-outline-variant/20 bg-surface-container-lowest">
            <img
              src={article.imageUrl}
              alt={article.imageAlt}
              className="w-full h-full object-cover grayscale opacity-80 mix-blend-luminosity hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
          </div>

          {/* Main Body HTML text */}
          <div
            className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed select-text space-y-4"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Footer Area */}
          <div className="mt-12 pt-8 border-t border-outline-variant/20 text-center">
            <div className="w-8 h-8 rounded-full border border-primary-container/40 inline-flex items-center justify-center text-primary-container font-serif italic font-bold select-none mb-3">
              V
            </div>
            <p className="text-label-sm text-on-surface-variant/50">
              © Vee Track Editorial Group. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
