import { serviceClient, withSession } from "./supabase";
import type { Session } from "@/lib/auth/session";

export type Window = "today" | "week" | "month";

function sinceISO(window: Window): string {
  const now = new Date();
  if (window === "today") {
    const d = new Date(now); d.setHours(0, 0, 0, 0); return d.toISOString();
  }
  if (window === "week") {
    const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString();
  }
  const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString();
}

export async function ownerSummary(session: Session, window: Window) {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const since = sinceISO(window);

    const { data: items, error } = await c
      .from("sale_items")
      .select("qty, unit_price, unit_cost, product_id, sales!inner(created_at)")
      .gte("sales.created_at", since);
    if (error) throw error;

    let revenue = 0, profit = 0;
    const byProduct = new Map<string, { qty: number; revenue: number }>();
    for (const r of items ?? []) {
      const line = Number(r.unit_price) * r.qty;
      revenue += line;
      profit += line - Number(r.unit_cost) * r.qty;
      const cur = byProduct.get(r.product_id) ?? { qty: 0, revenue: 0 };
      cur.qty += r.qty; cur.revenue += line;
      byProduct.set(r.product_id, cur);
    }

    const topIds = [...byProduct.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 5).map(([id]) => id);
    const { data: names } = topIds.length
      ? await c.from("products").select("id, name").in("id", topIds)
      : { data: [] as { id: string; name: string }[] };
    const nameMap = new Map((names ?? []).map((n) => [n.id, n.name]));
    const top = topIds.map((id) => ({ id, name: nameMap.get(id) ?? id, ...byProduct.get(id)! }));

    const { data: low } = await c
      .from("products")
      .select("id, name, stock, low_stock_threshold")
      .eq("archived", false)
      .filter("stock", "lte", "low_stock_threshold");

    return { revenue, profit, top, lowStock: low ?? [] };
  });
}
