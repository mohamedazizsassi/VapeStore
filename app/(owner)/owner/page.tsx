import Link from "next/link";
import { requireOwner } from "@/lib/auth/session";
import { ownerSummary, type Window } from "@/lib/db/dashboard";
import { formatMoney } from "@/lib/utils/money";

export default async function OwnerDashboard({
  searchParams,
}: {
  searchParams: { w?: string };
}) {
  const s = await requireOwner();
  const w = (["today", "week", "month"].includes(searchParams.w ?? "") ? searchParams.w : "today") as Window;
  const data = await ownerSummary(s, w);
  const maxQty = Math.max(1, ...data.top.map((t) => t.qty));

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        {(["today", "week", "month"] as const).map((p) => (
          <Link
            key={p}
            href={`/owner?w=${p}`}
            className={`px-3 py-2 rounded text-sm ${p === w ? "bg-brand text-brand-fg" : "bg-white/5"}`}
          >
            {p}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-xs text-white/60">Revenue</div>
          <div className="text-xl font-semibold">{formatMoney(data.revenue)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-white/60">Profit</div>
          <div className="text-xl font-semibold">{formatMoney(data.profit)}</div>
        </div>
      </div>

      <section className="card">
        <h2 className="font-medium mb-2">Top sellers</h2>
        {data.top.length === 0 ? (
          <p className="text-sm text-white/50">No sales yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.top.map((t) => (
              <li key={t.id}>
                <div className="flex justify-between text-sm">
                  <span className="truncate">{t.name}</span>
                  <span className="text-white/70">{t.qty} · {formatMoney(t.revenue)}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded mt-1">
                  <div className="h-full bg-brand rounded" style={{ width: `${(t.qty / maxQty) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="font-medium mb-2">Low stock</h2>
        {data.lowStock.length === 0 ? (
          <p className="text-sm text-white/50">All good.</p>
        ) : (
          <ul className="text-sm divide-y divide-white/10">
            {data.lowStock.map((p) => (
              <li key={p.id} className="flex justify-between py-2">
                <span>{p.name}</span>
                <span className="text-amber-400">{p.stock} / {p.low_stock_threshold}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
