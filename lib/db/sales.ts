import { serviceClient, withSession } from "./supabase";
import type { Session } from "@/lib/auth/session";
import type { SaleInput } from "@/lib/schemas/sale";

export type RecordedSale = { id: string; total: number; created_at: string };

export async function recordSale(session: Session, input: SaleInput): Promise<RecordedSale> {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    // Dedupe by client_id: if a sale with matching audit_log entry exists, return it.
    const { data: dup } = await c
      .from("audit_log")
      .select("entity_id")
      .eq("action", "sale.insert")
      .eq("entity", "sale")
      .contains("payload_json", { client_id: input.client_id })
      .maybeSingle();
    if (dup?.entity_id) {
      const { data: existing } = await c
        .from("sales")
        .select("id, total, created_at")
        .eq("id", dup.entity_id)
        .single();
      if (existing) return existing as RecordedSale;
    }

    const ids = input.items.map((i) => i.product_id);
    const { data: products, error: pErr } = await c
      .from("products")
      .select("id, sell_price, cost_price, stock")
      .in("id", ids);
    if (pErr) throw pErr;

    const priceMap = new Map(products!.map((p) => [p.id, p]));
    let total = 0;
    for (const it of input.items) {
      const p = priceMap.get(it.product_id);
      if (!p) throw new Error(`unknown product ${it.product_id}`);
      if (p.stock < it.qty) throw new Error(`insufficient stock for ${p.id}`);
      total += Number(p.sell_price) * it.qty;
    }

    const { data: sale, error: sErr } = await c
      .from("sales")
      .insert({
        shift_id: input.shift_id,
        user_id: session.userId,
        total,
        payment_method: input.payment_method,
        customer_id: input.payment_method === "credit" ? input.customer_id : null,
      })
      .select("id, total, created_at")
      .single();
    if (sErr) throw sErr;

    const rows = input.items.map((it) => {
      const p = priceMap.get(it.product_id)!;
      return {
        sale_id: sale.id,
        product_id: it.product_id,
        qty: it.qty,
        unit_price: p.sell_price,
        unit_cost: p.cost_price,
      };
    });
    const { error: iErr } = await c.from("sale_items").insert(rows);
    if (iErr) throw iErr;

    await c.from("audit_log").insert({
      user_id: session.userId,
      action: "sale.insert",
      entity: "sale",
      entity_id: sale.id,
      payload_json: { client_id: input.client_id, items: input.items },
    });

    return sale as RecordedSale;
  });
}
