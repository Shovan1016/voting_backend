import { z } from "zod";

export const createPoolValidation = z.object({
  question: z.string().min(10),
  notes: z.string().optional(),
  closedAt: z.string().optional(),
});

export type CreatePoolInput = z.infer<typeof createPoolValidation>;
