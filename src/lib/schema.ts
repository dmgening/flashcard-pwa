import { z } from "zod";

export const levelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export const articleSchema = z.enum(["der", "die", "das"]);
export const auxSchema = z.enum(["haben", "sein"]);

const wordBase = z.object({
  id: z.string().min(1),
  lemma: z.string().min(1),
  en: z.array(z.string().min(1)).min(1),
  example: z.string().optional(),
});

export const wordSchema = z.discriminatedUnion("pos", [
  wordBase.extend({
    pos: z.literal("noun"),
    article: articleSchema,
    plural: z.string().nullable(),
  }),
  wordBase.extend({
    pos: z.literal("verb"),
    aux: auxSchema,
    partizip: z.string().min(1),
  }),
  wordBase.extend({
    pos: z.enum(["adj", "adv", "prep", "conj", "other"]),
  }),
]);

export const deckSchema = z.object({
  id: z.string().min(1),
  language: z.literal("de"),
  level: levelSchema,
  name: z.string().min(1),
  words: z.array(wordSchema),
});

export type Word = z.infer<typeof wordSchema>;
export type Deck = z.infer<typeof deckSchema>;
export type Level = z.infer<typeof levelSchema>;
