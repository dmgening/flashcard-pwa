// tools/build-decks/src/enrich-schema.ts
import { z } from "zod";

export const enrichedFieldsSchema = z.object({
  en: z.array(z.string().min(1)).min(1).max(5),
  aux: z.enum(["haben", "sein"]).optional(),
  partizip: z.string().min(1).optional(),
  example: z.string().min(1).optional(),
});

export type EnrichedFields = z.infer<typeof enrichedFieldsSchema>;
