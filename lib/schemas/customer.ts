import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const paymentSchema = z.object({
  customer_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  note: z.string().trim().max(500).optional(),
});
export type PaymentInput = z.infer<typeof paymentSchema>;
