import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category_id: z.string().uuid().nullable().optional(),
  cost_price: z.coerce.number().nonnegative(),
  sell_price: z.coerce.number().nonnegative(),
  low_stock_threshold: z.coerce.number().int().min(0).default(5),
  photo_url: z.string().url().nullable().optional(),
  barcode: z.string().trim().max(64).nullable().optional(),
});
export type ProductInput = z.infer<typeof productSchema>;

export const restockSchema = z.object({
  product_id: z.string().uuid(),
  qty: z.coerce.number().int().positive(),
  unit_cost: z.coerce.number().nonnegative(),
  supplier: z.string().trim().max(120).optional(),
});
export type RestockInput = z.infer<typeof restockSchema>;
