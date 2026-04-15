import { z } from "zod";

export const saleItemInput = z.object({
  product_id: z.string().uuid(),
  qty: z.number().int().positive(),
});

export const saleSchema = z
  .object({
    client_id: z.string().uuid(),
    shift_id: z.string().uuid(),
    payment_method: z.enum(["cash", "other", "credit"]),
    customer_id: z.string().uuid().nullable().optional(),
    items: z.array(saleItemInput).min(1),
  })
  .refine(
    (v) => (v.payment_method === "credit" ? !!v.customer_id : !v.customer_id),
    { message: "customer_id required for credit, forbidden otherwise", path: ["customer_id"] },
  );
export type SaleInput = z.infer<typeof saleSchema>;

export const shiftOpenSchema = z.object({
  opening_cash: z.coerce.number().nonnegative(),
});
export const shiftCloseSchema = z.object({
  closing_cash: z.coerce.number().nonnegative(),
  note: z.string().trim().max(500).optional(),
});
