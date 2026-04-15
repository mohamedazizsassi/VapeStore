import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth/session";
import { listForOwner } from "@/lib/db/products";
import { recordRestock } from "@/lib/db/restocks";
import { restockSchema } from "@/lib/schemas/product";

async function restockAction(formData: FormData) {
  "use server";
  const s = await requireOwner();
  const parsed = restockSchema.safeParse({
    product_id: formData.get("product_id"),
    qty: formData.get("qty"),
    unit_cost: formData.get("unit_cost"),
    supplier: formData.get("supplier") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "invalid");
  await recordRestock(s, parsed.data);
  redirect("/owner/products");
}

export default async function RestockPage() {
  const s = await requireOwner();
  const products = await listForOwner(s);
  return (
    <div className="p-4">
      <div className="card">
        <h1 className="text-xl font-semibold mb-3">Restock</h1>
        <form action={restockAction} className="space-y-3">
          <label className="block">
            <span className="text-sm text-white/70">Product</span>
            <select name="product_id" className="input mt-1" required>
              {products.filter((p) => !p.archived).map((p) => (
                <option key={p.id} value={p.id}>{p.name} (stock {p.stock})</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-white/70">Qty</span>
              <input name="qty" type="number" min="1" className="input mt-1" required />
            </label>
            <label className="block">
              <span className="text-sm text-white/70">Unit cost</span>
              <input name="unit_cost" type="number" step="0.001" min="0" className="input mt-1" required />
            </label>
          </div>
          <label className="block">
            <span className="text-sm text-white/70">Supplier (optional)</span>
            <input name="supplier" className="input mt-1" />
          </label>
          <button className="btn w-full" type="submit">Record restock</button>
        </form>
      </div>
    </div>
  );
}
