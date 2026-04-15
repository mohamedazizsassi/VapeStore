import { requireOwner } from "@/lib/auth/session";
import { listForOwner } from "@/lib/db/products";
import { formatMoney } from "@/lib/utils/money";
import Link from "next/link";

export default async function ProductsPage() {
  const s = await requireOwner();
  const products = await listForOwner(s);
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Products</h1>
        <Link href="/owner/products/new" className="btn">New</Link>
      </div>
      <ul className="divide-y divide-white/10">
        {products.map((p) => (
          <li key={p.id} className="py-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.name}{p.archived ? " (archived)" : ""}</div>
              <div className="text-xs text-white/60">
                sell {formatMoney(p.sell_price)} · cost {formatMoney(p.cost_price)} · stock {p.stock}
              </div>
            </div>
            <Link href={`/owner/products/${p.id}`} className="btn-ghost px-3 py-2">Edit</Link>
          </li>
        ))}
        {products.length === 0 && <li className="text-sm text-white/50 py-4">No products yet.</li>}
      </ul>
    </div>
  );
}
