import { z } from "zod";

export const addOptionValidation = z.object({
  option: z.string().min(1, "Option text is required").max(255),
  displayOrder: z.number().int().nonnegative(),
});

export const addMultipleOptionsValidation = z.object({
  options: z
    .array(
      z.object({
        option: z.string().min(1, "Option text is required").max(255),
        displayOrder: z.number().int().nonnegative(),
      }),
    )
    .min(1, "At least one option is required"),
});

export const updateOptionValidation = z.object({
  option: z.string().min(1).max(255).optional(),
  displayOrder: z.number().int().nonnegative().optional(),
}).refine(
  (data) => data.option !== undefined || data.displayOrder !== undefined,
  { message: "At least one field (option or displayOrder) must be provided" },
);