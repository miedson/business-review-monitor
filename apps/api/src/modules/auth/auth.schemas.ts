import { z } from "zod";

export const registerBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(200),
});

export const loginBodySchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1).max(200),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
