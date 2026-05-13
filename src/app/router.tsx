import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { DecksRoute } from "@/routes/decks";
import { StudyRoute } from "@/routes/study";
import { StatsRoute } from "@/routes/stats";
import { SettingsRoute } from "@/routes/settings";
import { TabBar } from "./tab-bar";
import { getSettings } from "@/db/dexie";

function Layout() {
  return (
    <div className="min-h-full pb-16">
      <Outlet />
      <TabBar />
    </div>
  );
}

function StudyRedirect() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getSettings().then((s) => {
      const id = s.activeDeckId ?? "de-a1";
      navigate(`/study/${id}`, { replace: true });
      setReady(true);
    });
  }, [navigate]);
  return ready ? null : <div className="p-4 text-neutral-500">Loading…</div>;
}

function StatsRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    getSettings().then((s) => navigate(`/stats/${s.activeDeckId ?? "de-a1"}`, { replace: true }));
  }, [navigate]);
  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/decks" replace />} />
          <Route path="/decks" element={<DecksRoute />} />
          <Route path="/study" element={<StudyRedirect />} />
          <Route path="/study/:deckId" element={<StudyRoute />} />
          <Route path="/stats" element={<StatsRedirect />} />
          <Route path="/stats/:deckId" element={<StatsRoute />} />
          <Route path="/settings" element={<SettingsRoute />} />
          <Route path="*" element={<Navigate to="/decks" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
