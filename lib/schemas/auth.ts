import { z } from "zod";

export const loginSchema = z.object({
  name: z.string().trim().min(1).max(64),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
});
export type LoginInput = z.infer<typeof loginSchema>;
