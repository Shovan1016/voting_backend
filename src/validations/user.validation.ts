import { z } from "zod";

export const createUserValidator = z.object({
  // age: z.number().min(5).max(120),
  dateOfBirth: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string().optional(),
  password: z.string().min(6),
});

export const loginUserValidator = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type CreateUserInput = z.infer<typeof createUserValidator>;
export type LoginUserInput = z.infer<typeof loginUserValidator>;
