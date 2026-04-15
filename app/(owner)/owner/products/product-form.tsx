type Defaults = Partial<{
  name: string;
  cost_price: number | string;
  sell_price: number | string;
  low_stock_threshold: number | string;
  photo_url: string;
  barcode: string;
}>;

export function ProductForm({
  action,
  defaults = {},
  submitLabel = "Save",
}: {
  action: (form: FormData) => void | Promise<void>;
  defaults?: Defaults;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="text-sm text-white/70">Name</span>
        <input name="name" className="input mt-1" defaultValue={defaults.name ?? ""} required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-white/70">Cost price</span>
          <input name="cost_price" type="number" step="0.001" min="0" className="input mt-1" defaultValue={String(defaults.cost_price ?? 0)} required />
        </label>
        <label className="block">
          <span className="text-sm text-white/70">Sell price</span>
          <input name="sell_price" type="number" step="0.001" min="0" className="input mt-1" defaultValue={String(defaults.sell_price ?? 0)} required />
        </label>
      </div>
      <label className="block">
        <span className="text-sm text-white/70">Low-stock threshold</span>
        <input name="low_stock_threshold" type="number" min="0" className="input mt-1" defaultValue={String(defaults.low_stock_threshold ?? 5)} />
      </label>
      <label className="block">
        <span className="text-sm text-white/70">Photo URL (optional)</span>
        <input name="photo_url" type="url" className="input mt-1" defaultValue={defaults.photo_url ?? ""} />
      </label>
      <label className="block">
        <span className="text-sm text-white/70">Barcode (optional)</span>
        <input name="barcode" className="input mt-1" defaultValue={defaults.barcode ?? ""} />
      </label>
      <button className="btn w-full" type="submit">{submitLabel}</button>
    </form>
  );
}
