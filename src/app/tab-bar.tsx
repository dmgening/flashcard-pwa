import { NavLink } from "react-router-dom";

const tab = "flex-1 py-3 text-center text-xs uppercase tracking-wide";

export function TabBar() {
  return (
    <nav className="flex border-t border-neutral-800 bg-neutral-950 fixed bottom-0 inset-x-0">
      <NavLink to="/decks" className={({ isActive }) =>
        `${tab} ${isActive ? "text-neutral-100 border-t-2 border-sky-400 -mt-px" : "text-neutral-500"}`}>
        Decks
      </NavLink>
      <NavLink to="/study" className={({ isActive }) =>
        `${tab} ${isActive ? "text-neutral-100 border-t-2 border-sky-400 -mt-px" : "text-neutral-500"}`}>
        Study
      </NavLink>
      <NavLink to="/stats" className={({ isActive }) =>
        `${tab} ${isActive ? "text-neutral-100 border-t-2 border-sky-400 -mt-px" : "text-neutral-500"}`}>
        Stats
      </NavLink>
    </nav>
  );
}
