import Dexie, { type Table } from "dexie";

export type StatRow = {
  deckId: string;
  wordId: string;
  attempts: number;
  successes: number;
  lastSeenAt: number;
  lastResult: "hit" | "miss";
};

export type SettingsRow = {
  id: "singleton";
  activeDeckId: string | null;
  ttsVoiceURI: string | null;
  soundOn: boolean;
};

export class AppDB extends Dexie {
  stats!: Table<StatRow, [string, string]>;
  settings!: Table<SettingsRow, string>;

  constructor() {
    super("flashcard-pwa");
    this.version(1).stores({
      stats: "[deckId+wordId], deckId, lastSeenAt",
      settings: "id",
    });
  }
}

export const db = new AppDB();

export async function getSettings(): Promise<SettingsRow> {
  const existing = await db.settings.get("singleton");
  if (existing) return existing;
  const defaults: SettingsRow = {
    id: "singleton",
    activeDeckId: null,
    ttsVoiceURI: null,
    soundOn: true,
  };
  await db.settings.put(defaults);
  return defaults;
}

export async function setSettings(patch: Partial<Omit<SettingsRow, "id">>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch });
}
