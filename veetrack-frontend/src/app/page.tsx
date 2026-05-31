"use client";

import { AnimatePresence } from "framer-motion";
import { useKeywordStore } from "@/lib/stores/keyword-store";
import KeywordInputScreen from "@/screens/KeywordInputScreen";
import FeedScreen from "@/screens/FeedScreen";
import ArticleDrillDown from "@/screens/ArticleDrillDown";
import IntelligenceScreen from "@/screens/IntelligenceScreen";
import ClientBriefScreen from "@/screens/ClientBriefScreen";
import AlertToast from "@/components/alerts/AlertToast";
import { useAlertSocket } from "@/hooks/useAlertSocket";

function AlertSystem() {
  useAlertSocket();
  return <AlertToast />;
}

export default function Home() {
  // Use separate primitive selectors — object selectors create new refs every render
  // and cause infinite loops with useSyncExternalStore in Next.js 16.
  const screen = useKeywordStore((s) => s.screen);
  const setScreen = useKeywordStore((s) => s.setScreen);

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      {/* Alert system — mounted globally, persists across screens */}
      <AlertSystem />

      <AnimatePresence mode="wait">
        {screen === "input" && <KeywordInputScreen key="input" />}
        {screen === "feed" && <FeedScreen key="feed" />}
        {screen === "article" && <ArticleDrillDown key="article" />}
        {screen === "intelligence" && <IntelligenceScreen key="intelligence" />}
        {screen === "clients" && (
          <ClientBriefScreen key="clients" onBack={() => setScreen("input")} />
        )}
      </AnimatePresence>
    </main>
  );
}
