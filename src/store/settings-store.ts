import { create } from "zustand";
import { getSettings, setSettings, type SettingsRow } from "@/db/dexie";

type SettingsState = {
  loaded: boolean;
  soundOn: boolean;
  ttsVoiceURI: string | null;
  activeDeckId: string | null;
  load: () => Promise<void>;
  update: (patch: Partial<Omit<SettingsRow, "id">>) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  loaded: false,
  soundOn: true,
  ttsVoiceURI: null,
  activeDeckId: null,
  load: async () => {
    const s = await getSettings();
    set({
      loaded: true,
      soundOn: s.soundOn,
      ttsVoiceURI: s.ttsVoiceURI,
      activeDeckId: s.activeDeckId,
    });
  },
  update: async (patch) => {
    await setSettings(patch);
    const s = await getSettings();
    set({
      soundOn: s.soundOn,
      ttsVoiceURI: s.ttsVoiceURI,
      activeDeckId: s.activeDeckId,
    });
  },
}));
