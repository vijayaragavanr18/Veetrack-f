'use client';

import React from 'react';
import { Newspaper, Compass, Bookmark, User } from 'lucide-react';
export const BottomNav = ({
  activeTab = 'foryou',
  onTabChange,
  visible = true
}) => {
  const handleTabClick = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };
  const tabs = [{
    id: 'foryou',
    label: 'For You',
    icon: Newspaper
  }, {
    id: 'explore',
    label: 'Explore',
    icon: Compass
  }, {
    id: 'saved',
    label: 'Saved',
    icon: Bookmark
  }, {
    id: 'profile',
    label: 'Profile',
    icon: User
  }];
  return <nav className={`fixed bottom-0 left-0 w-full flex justify-around items-center py-3 bg-background border-t border-surface-container-highest z-50 transition-all duration-300 md:hidden ${visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
      {tabs.map((tab) => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;
      return <button key={tab.id} onClick={() => handleTabClick(tab.id)} className={`flex flex-col items-center justify-center w-20 py-1 transition-all duration-200 cursor-pointer rounded-xl ${isActive ? 'text-primary-container scale-100' : 'text-on-surface-variant hover:text-primary scale-95 active:scale-90'}`}>
            <div className={`p-1.5 rounded-full transition-colors duration-200 ${isActive ? 'bg-on-primary-container/20 text-primary-container' : 'bg-transparent'}`}>
              <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`font-label-sm text-label-sm mt-0.5 tracking-wider transition-colors duration-200 ${isActive ? 'text-primary-container font-semibold' : 'text-on-surface-variant'}`}>
              {tab.label}
            </span>
          </button>;
    })}
    </nav>;
};