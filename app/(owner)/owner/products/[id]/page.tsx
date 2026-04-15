import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth/session";
import { listForOwner } from "@/lib/db/products";
import { ProductForm } from "../product-form";
import { updateProductAction, archiveProductAction } from "../actions";

export default async function EditProduct({ params }: { params: { id: string } }) {
  const s = await requireOwner();
  const all = await listForOwner(s);
  const p = all.find((x) => x.id === params.id);
  if (!p) notFound();

  const update = updateProductAction.bind(null, p.id);
  const archive = archiveProductAction.bind(null, p.id);

  return (
    <div className="p-4 space-y-3">
      <div className="card">
        <h1 className="text-xl font-semibold mb-3">Edit product</h1>
        <ProductForm
          action={update}
          submitLabel="Save"
          defaults={{
            name: p.name,
            cost_price: p.cost_price,
            sell_price: p.sell_price,
            low_stock_threshold: p.low_stock_threshold,
            photo_url: p.photo_url ?? "",
            barcode: p.barcode ?? "",
          }}
        />
      </div>
      {!p.archived && (
        <form action={archive} className="card">
          <button className="btn-ghost w-full text-red-300" type="submit">Archive product</button>
        </form>
      )}
    </div>
  );
}
