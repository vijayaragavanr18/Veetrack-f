'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NewsCard } from './NewsCard';
export const NewsReader = ({
  articles,
  onReadFullStory,
  onActiveIndexChange
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animatingIndex, setAnimatingIndex] = useState(null);
  const [animationDirection, setAnimationDirection] = useState(null);
  const [activeSubPageIndex, setActiveSubPageIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const isAnimating = animatingIndex !== null;
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);
  const dragDirection = useRef(null);
  const lastHorizontalSwipeTime = useRef(0);
  const lastVerticalSwipeTime = useRef(0);
  const containerRef = useRef(null);

  // Notify parent component about current article index changes
  useEffect(() => {
    if (onActiveIndexChange) {
      onActiveIndexChange(currentIndex);
    }
  }, [currentIndex, onActiveIndexChange]);
  const transitionCard = useCallback((direction) => {
    const now = Date.now();
    if (isAnimating || now - lastVerticalSwipeTime.current < 900) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= articles.length) return;
    lastVerticalSwipeTime.current = now;
    setAnimatingIndex(nextIndex);
    setAnimationDirection(direction > 0 ? 'next' : 'prev');
    setActiveSubPageIndex(0); // Reset sub-page when vertical article changes

    setTimeout(() => {
      setCurrentIndex(nextIndex);
      setAnimatingIndex(null);
      setAnimationDirection(null);
    }, 800); // 800ms matching CSS flip transition duration
  }, [currentIndex, isAnimating, articles.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent keyboard scrolling when modal is open
      if (document.body.style.overflow === 'hidden') return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        transitionCard(1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        transitionCard(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveSubPageIndex((prev) => Math.min(prev + 1, 3));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveSubPageIndex((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transitionCard]);

  // Drag handling helpers
  const startDrag = (clientX, clientY) => {
    if (isAnimating) return;
    isDragging.current = true;
    setIsDraggingState(true);
    dragStartX.current = clientX;
    dragStartY.current = clientY;
    dragDirection.current = null;
    setDragOffset(0);
  };
  const moveDrag = (clientX, clientY, preventDefault) => {
    if (!isDragging.current) return;
    const deltaX = clientX - dragStartX.current;
    const deltaY = clientY - dragStartY.current;
    if (!dragDirection.current) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      // Lock gesture direction after small threshold (8px)
      if (absX > 8 || absY > 8) {
        dragDirection.current = absX > absY ? 'horizontal' : 'vertical';
      }
    }
    if (dragDirection.current === 'horizontal') {
      if (preventDefault) preventDefault();

      // Rubber-banding at boundaries
      let offset = deltaX;
      if (activeSubPageIndex === 0 && offset > 0) {
        offset = Math.pow(offset, 0.85); // drag right on page 1
      } else if (activeSubPageIndex === 3 && offset < 0) {
        offset = -Math.pow(-offset, 0.85); // drag left on page 4
      }
      setDragOffset(offset);
    }
  };
  const endDrag = (clientX, clientY) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setIsDraggingState(false);
    const deltaX = clientX - dragStartX.current;
    const deltaY = clientY - dragStartY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const cardWidth = containerRef.current?.getBoundingClientRect().width || 450;
    if (dragDirection.current === 'horizontal') {
      // 20% width or 70px threshold
      const threshold = Math.min(cardWidth * 0.2, 70);
      if (absDeltaX > threshold) {
        if (deltaX < 0) {
          // Dragged left -> next sub-page
          setActiveSubPageIndex((prev) => Math.min(prev + 1, 3));
        } else {
          // Dragged right -> prev sub-page
          setActiveSubPageIndex((prev) => Math.max(prev - 1, 0));
        }
      }
    } else if (dragDirection.current === 'vertical') {
      // Threshold of 50px for vertical card transitions
      if (absDeltaY > 50) {
        if (deltaY > 0) {
          transitionCard(1); // Swipe up -> next page
        } else {
          transitionCard(-1); // Swipe down -> prev page
        }
      }
    }
    setDragOffset(0);
    dragDirection.current = null;
  };

  // Touch Swipe Handlers (supports 2D dynamic swiping)
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  };
  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY, () => {
      if (e.cancelable) e.preventDefault();
    });
  };
  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    endDrag(touch.clientX, touch.clientY);
  };

  // Mouse Drag Handlers (supports dragging with a mouse on desktop)
  const handleMouseDown = (e) => {
    startDrag(e.clientX, e.clientY);
  };
  const handleMouseMove = (e) => {
    moveDrag(e.clientX, e.clientY);
  };
  const handleMouseUp = (e) => {
    endDrag(e.clientX, e.clientY);
  };
  const handleMouseLeave = (e) => {
    endDrag(e.clientX, e.clientY);
  };

  // Mouse Wheel / Trackpad Scroll Handler (supports 2D trackpad scrolling with cooldowns)
  const handleWheel = (e) => {
    if (isAnimating) return;
    const absDeltaX = Math.abs(e.deltaX);
    const absDeltaY = Math.abs(e.deltaY);
    const now = Date.now();
    if (absDeltaX > absDeltaY) {
      // Horizontal trackpad scroll
      if (absDeltaX > 15) {
        // Cooldown of 600ms to prevent rapid page switching
        if (now - lastHorizontalSwipeTime.current > 600) {
          if (e.deltaX > 0) {
            setActiveSubPageIndex((prev) => Math.min(prev + 1, 3));
          } else {
            setActiveSubPageIndex((prev) => Math.max(prev - 1, 0));
          }
          lastHorizontalSwipeTime.current = now;
        }
      }
    } else {
      // Vertical trackpad/mouse scroll
      if (absDeltaY > 15) {
        if (e.deltaY > 0) {
          transitionCard(1); // Scroll down -> next page
        } else {
          transitionCard(-1); // Scroll up -> prev page
        }
      }
    }
  };
  const getContainerClass = () => {
    if (animationDirection === 'next') return 'animating-next';
    if (animationDirection === 'prev') return 'animating-prev';
    return '';
  };
  return <div className="w-full h-full flex items-center justify-center relative">
      {/* Side Dot Navigation (Visual indicator for vertical page progress) */}
      <div className="absolute right-4 md:right-8 flex flex-col gap-3 z-30">
        {articles.map((_, idx) => <button key={idx} onClick={() => {
        if (idx !== currentIndex) {
          transitionCard(idx - currentIndex);
        }
      }} aria-label={`Go to page ${idx + 1}`} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${idx === currentIndex ? 'bg-primary-container scale-125 shadow-md shadow-primary-container/20' : 'bg-on-surface-variant/30 hover:bg-on-surface-variant/60'}`} />)}
      </div>

      {/* Main 3D Card Stage */}
      <div ref={containerRef} onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} className={`perspective-container w-full max-w-[450px] sm:max-w-[540px] md:max-w-[620px] lg:max-w-[680px] h-full relative ${getContainerClass()}`} id="reader-container" style={{
      touchAction: 'none'
    }}>
        {articles.map((article, idx) => {
        let stateClass = '';
        if (idx === currentIndex) {
          stateClass = 'active';
        } else if (animationDirection === 'next' && idx === animatingIndex) {
          stateClass = 'next';
        } else if (animationDirection === 'prev' && idx === animatingIndex) {
          stateClass = 'prev';
        }
        return <NewsCard key={article.id} article={article} stateClass={stateClass} activePageIndex={idx === currentIndex ? activeSubPageIndex : 0} onPageChange={idx === currentIndex ? setActiveSubPageIndex : undefined} onReadFullStory={onReadFullStory} dragOffset={idx === currentIndex ? dragOffset : 0} isDragging={idx === currentIndex ? isDraggingState : false} />;
      })}
      </div>
    </div>;
};