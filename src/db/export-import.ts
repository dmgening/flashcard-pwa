import { z } from "zod";
import { db, type StatRow, type SettingsRow } from "./dexie";

const statRowSchema = z.object({
  deckId: z.string(),
  wordId: z.string(),
  attempts: z.number().int().min(0),
  successes: z.number().int().min(0),
  lastSeenAt: z.number().int().min(0),
  lastResult: z.enum(["hit", "miss"]),
});

const settingsRowSchema = z.object({
  id: z.literal("singleton"),
  activeDeckId: z.string().nullable(),
  ttsVoiceURI: z.string().nullable(),
  soundOn: z.boolean(),
});

const exportSchema = z.object({
  version: z.literal(1),
  stats: z.array(statRowSchema),
  settings: settingsRowSchema,
});

export type ExportPayload = z.infer<typeof exportSchema>;
export type ImportMode = "merge" | "replace";

export async function exportAll(): Promise<ExportPayload> {
  const stats = await db.stats.toArray();
  const settings = (await db.settings.get("singleton")) ?? {
    id: "singleton" as const, activeDeckId: null, ttsVoiceURI: null, soundOn: true,
  };
  return { version: 1, stats, settings };
}

export async function importAll(raw: unknown, mode: ImportMode): Promise<void> {
  const data = exportSchema.parse(raw);
  await db.transaction("rw", db.stats, db.settings, async () => {
    if (mode === "replace") {
      await db.stats.clear();
      await db.stats.bulkPut(data.stats);
      await db.settings.put(data.settings);
      return;
    }
    // merge
    for (const incoming of data.stats) {
      const existing = await db.stats.get([incoming.deckId, incoming.wordId]);
      if (!existing) {
        await db.stats.put(incoming);
      } else {
        const useIncoming = incoming.lastSeenAt >= existing.lastSeenAt;
        await db.stats.put({
          deckId: incoming.deckId,
          wordId: incoming.wordId,
          attempts: existing.attempts + incoming.attempts,
          successes: existing.successes + incoming.successes,
          lastSeenAt: Math.max(existing.lastSeenAt, incoming.lastSeenAt),
          lastResult: useIncoming ? incoming.lastResult : existing.lastResult,
        } satisfies StatRow);
      }
    }
    // Settings: merge favors incoming when fields are non-null
    const existingSettings = (await db.settings.get("singleton"));
    const merged: SettingsRow = {
      id: "singleton",
      activeDeckId: data.settings.activeDeckId ?? existingSettings?.activeDeckId ?? null,
      ttsVoiceURI: data.settings.ttsVoiceURI ?? existingSettings?.ttsVoiceURI ?? null,
      soundOn: data.settings.soundOn,
    };
    await db.settings.put(merged);
  });
}
