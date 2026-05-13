import { useEffect } from "react";
import { AppRouter } from "./router";
import { useSettingsStore } from "@/store/settings-store";

export function App() {
  const load = useSettingsStore((s) => s.load);
  useEffect(() => { load(); }, [load]);
  return <AppRouter />;
}
