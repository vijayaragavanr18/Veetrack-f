'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface HeaderProps {
  onSearch?: (keyword: string) => void;
  onLogoClick?: () => void;
  visible?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  hideNav?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onSearch,
  onLogoClick,
  visible = true,
  activeTab = 'foryou',
  onTabChange,
  hideNav = false,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'foryou', label: 'For You' },
    { id: 'explore', label: 'Explore' },
    { id: 'saved', label: 'Saved' },
    { id: 'profile', label: 'Profile' },
  ];

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim() && onSearch) {
      onSearch(keyword.trim());
      setIsSearchOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-40 bg-background/90 backdrop-blur-md border-b border-outline-variant/30 flex items-center justify-between px-container-padding h-16 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      {isSearchOpen ? (
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-3 animate-fade-in">
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false);
              setKeyword('');
            }}
            className="text-on-surface-variant hover:text-primary flex items-center justify-center p-2 rounded-full transition-colors cursor-pointer"
            aria-label="Close search"
          >
            <X size={20} />
          </button>
          
          <input
            ref={inputRef}
            type="text"
            placeholder="Type keyword and press Enter (e.g. Tesla, Space)..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="flex-1 bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-1.5 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary-container transition-all text-body-md"
          />

          <button
            type="submit"
            aria-label="Submit Search"
            className="text-primary-container hover:text-primary flex items-center justify-center p-2 bg-primary-container/10 border border-primary-container/20 rounded-full transition-colors cursor-pointer"
          >
            <Search size={18} />
          </button>
        </form>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div 
              onClick={onLogoClick}
              className="font-headline-lg-mobile text-headline-lg-mobile tracking-tighter text-primary font-bold select-none cursor-pointer flex items-center gap-2"
            >
              <svg className="w-7 h-7 text-primary-container" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" className="opacity-25" />
                <path d="M12 3v5.5" />
                <path d="M7 8.5l5 7 5-7" />
                <path d="M12 15.5V21" />
              </svg>
              <span>VEE TRACK</span>
            </div>
          </div>

          {/* Desktop Header Nav Links */}
          {!hideNav && (
            <nav className="hidden md:flex items-center gap-8 h-full">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange?.(tab.id)}
                    className={`relative h-full px-1 flex items-center justify-center font-label-md text-label-md uppercase tracking-widest transition-colors cursor-pointer select-none ${
                      isActive ? 'text-primary-container font-semibold' : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary-container" />
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {!hideNav ? (
            <button
              aria-label="Search"
              onClick={() => setIsSearchOpen(true)}
              className="text-on-surface-variant hover:text-primary flex items-center justify-center p-2 rounded-full transition-colors cursor-pointer"
            >
              <Search size={22} />
            </button>
          ) : (
            <div className="w-9 h-9" /> /* Spacer to keep logo layout centered */
          )}
        </>
      )}
    </header>
  );
};
