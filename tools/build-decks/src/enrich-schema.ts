// tools/build-decks/src/enrich-schema.ts
import { z } from "zod";

export const enrichedFieldsSchema = z.object({
  en: z.array(z.string().min(1)).min(1).max(3),
  aux: z.enum(["haben", "sein"]).optional(),
  partizip: z.string().min(1).optional(),
  example: z.string().min(1).optional(),
});

export type EnrichedFields = z.infer<typeof enrichedFieldsSchema>;

// Batch response: one LLM call covers many words. The model returns
// `{ results: [{ idx, ...EnrichedFields }] }`. `idx` ties each item back
// to its slot in the input batch so we can match results to lemmas even
// if the model omits, reorders, or duplicates items.
export const batchItemSchema = enrichedFieldsSchema.extend({
  idx: z.number().int().min(0),
});

export const batchResponseSchema = z.object({
  results: z.array(batchItemSchema),
});

export type BatchItem = z.infer<typeof batchItemSchema>;
export type BatchResponse = z.infer<typeof batchResponseSchema>;
