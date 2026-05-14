import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DecksRoute } from "@/routes/decks";
import { StudyRoute } from "@/routes/study";
import { StatsRoute } from "@/routes/stats";
import { SettingsRoute } from "@/routes/settings";
import { TabBar } from "./tab-bar";
import { getSettings } from "@/db/dexie";
import { useAnim } from "@/lib/transitions";

const DEFAULT_DECK_ID = "de-a1";

function Layout() {
  return (
    <div className="min-h-full pb-16">
      <Outlet />
      <TabBar />
    </div>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  const anim = useAnim();
  return (
    <motion.div
      initial={{ opacity: 0, y: anim.reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: anim.reduced ? 0 : -8 }}
      transition={anim.fade}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

function useActiveDeckRedirect(toPath: (id: string) => string) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getSettings().then((s) => {
      navigate(toPath(s.activeDeckId ?? DEFAULT_DECK_ID), { replace: true });
      setReady(true);
    });
  }, [navigate, toPath]);
  return ready;
}

function StudyRedirect() {
  const ready = useActiveDeckRedirect((id) => `/study/${id}`);
  return ready ? null : <div className="p-4 text-neutral-500">Loading…</div>;
}

function StatsRedirect() {
  const ready = useActiveDeckRedirect((id) => `/stats/${id}`);
  return ready ? null : <div className="p-4 text-neutral-500">Loading…</div>;
}

function AnimatedRoutes() {
  const location = useLocation();
  // Key on the top-level route segment so swapping deck inside `/study/...`
  // doesn't trigger a page transition.
  const topSegment = location.pathname.split("/")[1] || "root";
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={topSegment}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/decks" replace />} />
          <Route path="/decks" element={<PageFrame><DecksRoute /></PageFrame>} />
          <Route path="/study" element={<PageFrame><StudyRedirect /></PageFrame>} />
          <Route path="/study/:deckId" element={<PageFrame><StudyRoute /></PageFrame>} />
          <Route path="/stats" element={<PageFrame><StatsRedirect /></PageFrame>} />
          <Route path="/stats/:deckId" element={<PageFrame><StatsRoute /></PageFrame>} />
          <Route path="/settings" element={<PageFrame><SettingsRoute /></PageFrame>} />
          <Route path="*" element={<Navigate to="/decks" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
