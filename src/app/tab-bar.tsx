import { NavLink, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Layers, BarChart3 } from "lucide-react";
import { useAnim } from "@/lib/transitions";

type Tab = { to: string; label: string; Icon: typeof Layers; matchPrefix: string };
// Decks is merged into Study: tapping Study returns you to the last deck;
// the deck picker is reachable from the Study header.
const TABS: Tab[] = [
  { to: "/study", label: "Study", Icon: Layers, matchPrefix: "/study" },
  { to: "/stats", label: "Stats", Icon: BarChart3, matchPrefix: "/stats" },
];

export function TabBar() {
  const { pathname } = useLocation();
  const anim = useAnim();

  return (
    <nav className="flex border-t border-neutral-800 bg-neutral-950 fixed bottom-0 inset-x-0">
      {TABS.map(({ to, label, Icon, matchPrefix }) => {
        const isActive = pathname.startsWith(matchPrefix);
        return (
          <NavLink key={to} to={to} className="relative flex-1 py-2 flex flex-col items-center justify-center">
            <span className={`relative z-10 flex flex-col items-center gap-0.5 ${isActive ? "text-neutral-100" : "text-neutral-500"}`}>
              <Icon size={20} strokeWidth={2} />
              <span className="text-[10px] uppercase tracking-wide">{label}</span>
            </span>
            {isActive && (
              <motion.span
                layoutId="tab-indicator"
                className="absolute inset-x-3 top-0 h-0.5 bg-sky-400 rounded-full"
                transition={anim.springSnappy}
              />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
