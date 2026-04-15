"use server";

import { requireSession } from "@/lib/auth/session";
import { saleSchema, type SaleInput } from "@/lib/schemas/sale";
import { recordSale } from "@/lib/db/sales";

export async function submitSaleAction(input: SaleInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const s = await requireSession();
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid sale" };
  try {
    const sale = await recordSale(s, parsed.data);
    return { ok: true, id: sale.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}
