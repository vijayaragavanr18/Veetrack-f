"use client";

import { motion } from "framer-motion";
import FlipPage from "./FlipPage";
import { Article } from "@/lib/data/articles";

/* ═══════════════════════════════════════════════════════════
   FLIPBOARD-STYLE HALF-PAGE VERTICAL FLIP CONTAINER
   
   Pure render component — animation state is managed by parent.
   
   Creates a magazine page-turn effect where:
   
   Going FORWARD (next article):
   - Bottom half of current page folds upward (rotateX)
   - Top half slides up and fades away
   - Next page is revealed underneath
   
   Going BACKWARD (previous article):
   - Top half of current page folds downward (rotateX)
   - Bottom half slides down and fades away
   - Previous page is revealed underneath
   
   ═══════════════════════════════════════════════════════════ */

interface FlipContainerProps {
  displayArticle: Article | null;
  exitArticle: Article | null;
  isFlipping: boolean;
  flipDir: number; // 1 = forward, -1 = backward
  onNavigate: (id: string) => void;
}

const FLIP_DURATION = 0.6;

export default function FlipContainer({
  displayArticle,
  exitArticle,
  isFlipping,
  flipDir,
  onNavigate,
}: FlipContainerProps) {
  const isForward = flipDir > 0;

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ perspective: 1200 }}>
      {/* ━━━ Layer 0: Target/entering article (fully visible, underneath) ━━━ */}
      {displayArticle && (
        <div className="absolute inset-0 z-0">
          <FlipPage article={displayArticle} onNavigate={onNavigate} />
        </div>
      )}

      {/* ━━━ Layer 1-3: Exiting article with half-flip animation ━━━ */}
      {isFlipping && exitArticle && (
        <>
          {/* ── Fixed half: slides away and fades ──
              Forward → Top half stays, slides up, fades out
              Backward → Bottom half stays, slides down, fades out */}
          <motion.div
            className="absolute inset-0 z-10"
            style={{
              clipPath: isForward
                ? "inset(0 0 50% 0)"     // Show top half
                : "inset(50% 0 0 0)",     // Show bottom half
            }}
            initial={{ y: 0, opacity: 1 }}
            animate={{
              y: isForward ? "-12%" : "12%",
              opacity: 0,
            }}
            transition={{
              duration: 0.5,
              delay: 0.08,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <FlipPage article={exitArticle} onNavigate={onNavigate} />
          </motion.div>

          {/* ── Flipping half: 3D page fold ──
              Forward → Bottom half folds upward (rotateX negative)
              Backward → Top half folds downward (rotateX positive)
              
              The element is full-page size, clipped to show only the flipping half.
              transformOrigin at center (fold line) makes the bottom/top
              rotate around the horizontal center of the page. */}
          <motion.div
            className="absolute inset-0 z-20"
            style={{
              clipPath: isForward
                ? "inset(50% 0 0 0)"     // Show bottom half
                : "inset(0 0 50% 0)",     // Show top half
              transformStyle: "preserve-3d",
            }}
            initial={{ rotateX: 0 }}
            animate={{ rotateX: isForward ? -100 : 100 }}
            transition={{
              duration: FLIP_DURATION,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            {/* Front face — article content */}
            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              <FlipPage article={exitArticle} onNavigate={onNavigate} />
            </div>

            {/* Back face — dark page back (visible as page folds past 90°) */}
            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateX(180deg)",
                background: "linear-gradient(135deg, #E8E8EC 0%, #F1F1F4 40%, #F5F5F7 70%, #F8F9FA 100%)",
              }}
            >
              {/* Subtle fold texture on the back */}
              <div
                className="absolute inset-0"
                style={{
                  background: isForward
                    ? "linear-gradient(to bottom, rgba(0,0,0,0.03) 0%, transparent 30%)"
                    : "linear-gradient(to top, rgba(0,0,0,0.03) 0%, transparent 30%)",
                }}
              />
            </div>
          </motion.div>

          {/* ── Shadow on the revealed portion of the next page ── */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 5,
              clipPath: isForward
                ? "inset(50% 0 0 0)"
                : "inset(0 0 50% 0)",
              background: isForward
                ? "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, transparent 70%)"
                : "linear-gradient(to top, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, transparent 70%)",
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          />

          {/* ── Fold line highlight ── */}
          <motion.div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              zIndex: 25,
              top: isForward ? "calc(50% - 0.5px)" : undefined,
              bottom: isForward ? undefined : "calc(50% - 0.5px)",
              height: 1,
              background: "linear-gradient(90deg, transparent 5%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.04) 70%, transparent 95%)",
            }}
            initial={{ opacity: 1, scaleX: 1 }}
            animate={{ opacity: 0, scaleX: 0.8 }}
            transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
          />

          {/* ── Lift shadow (casts shadow from the folding page onto the fixed half) ── */}
          <motion.div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              zIndex: 15,
              top: isForward ? "calc(50% - 20px)" : undefined,
              bottom: isForward ? undefined : "calc(50% - 20px)",
              height: 20,
              background: isForward
                ? "linear-gradient(to bottom, transparent, rgba(0,0,0,0.12))"
                : "linear-gradient(to top, transparent, rgba(0,0,0,0.12))",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            transition={{ duration: FLIP_DURATION, times: [0, 0.3, 0.8], ease: "easeOut" }}
          />
        </>
      )}
    </div>
  );
}
