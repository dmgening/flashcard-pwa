import { create } from "zustand";

type SessionState = {
  history: string[];
  done: number;
  missed: number;
  pushHistory: (wordId: string) => void;
  recordResult: (success: boolean) => void;
  resetSession: () => void;
};

const HISTORY_CAP = 100;

export const useSessionStore = create<SessionState>((set) => ({
  history: [],
  done: 0,
  missed: 0,
  pushHistory: (wordId) =>
    set((s) => {
      const next = [...s.history, wordId];
      if (next.length > HISTORY_CAP) next.splice(0, next.length - HISTORY_CAP);
      return { history: next };
    }),
  recordResult: (success) =>
    set((s) => ({
      done: s.done + 1,
      missed: s.missed + (success ? 0 : 1),
    })),
  resetSession: () => set({ history: [], done: 0, missed: 0 }),
}));
