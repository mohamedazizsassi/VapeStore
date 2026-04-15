"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import type { ProductForWorker } from "@/lib/db/products";
import type { CustomerRow } from "@/lib/db/customers";
import { formatMoney } from "@/lib/utils/money";
import { enqueueSale } from "@/lib/offline/queue";
import { submitSaleAction } from "./actions";

type CartLine = { product_id: string; name: string; qty: number; unit_price: number };

export function SaleScreen({
  shiftId,
  products,
  customers,
}: {
  shiftId: string;
  products: ProductForWorker[];
  customers: CustomerRow[];
}) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q));
  }, [products, query]);

  function add(p: ProductForWorker) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product_id === p.id);
      if (existing) return prev.map((l) => (l.product_id === p.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { product_id: p.id, name: p.name, qty: 1, unit_price: Number(p.sell_price) }];
    });
  }

  function setQty(id: string, qty: number) {
    setCart((prev) =>
      qty <= 0 ? prev.filter((l) => l.product_id !== id) : prev.map((l) => (l.product_id === id ? { ...l, qty } : l)),
    );
  }

  const total = cart.reduce((a, l) => a + l.qty * l.unit_price, 0);

  async function submit(payment_method: "cash" | "credit") {
    if (!cart.length) return;
    if (payment_method === "credit" && !customerId) {
      setError("Pick a customer to sell on credit.");
      return;
    }
    setError(null);
    start(async () => {
      const client_id = uuid();
      const payload = {
        client_id,
        shift_id: shiftId,
        payment_method,
        customer_id: payment_method === "credit" ? customerId : null,
        items: cart.map((l) => ({ product_id: l.product_id, qty: l.qty })),
      };
      try {
        const res = await submitSaleAction(payload);
        if (!res.ok) throw new Error(res.error);
        setCart([]);
        setCustomerId("");
        router.refresh();
      } catch {
        await enqueueSale(payload);
        setCart([]);
        setCustomerId("");
        setError("Offline — sale queued, will sync when back online.");
      }
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-52px)]">
      <div className="p-3 border-b border-white/10">
        <input
          className="input"
          placeholder="Search product or barcode"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-auto p-3 grid grid-cols-3 gap-2 content-start">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => add(p)}
            className="card text-left active:opacity-75 flex flex-col"
            disabled={p.stock <= 0}
          >
            <div className="aspect-square bg-white/5 rounded mb-2 overflow-hidden flex items-center justify-center text-xs text-white/40">
              {p.photo_url ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" /> : "no photo"}
            </div>
            <div className="text-sm font-medium line-clamp-2">{p.name}</div>
            <div className="text-xs text-white/60 mt-0.5">{formatMoney(p.sell_price)}</div>
            <div className={`text-xs mt-0.5 ${p.stock <= p.low_stock_threshold ? "text-amber-400" : "text-white/40"}`}>
              stock {p.stock}
            </div>
          </button>
        ))}
      </div>

      <div className="border-t border-white/10 p-3 space-y-2 bg-black/30">
        {cart.length === 0 ? (
          <p className="text-sm text-white/50">Tap a product to add</p>
        ) : (
          <ul className="space-y-1 max-h-40 overflow-auto">
            {cart.map((l) => (
              <li key={l.product_id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{l.name}</span>
                <button className="btn-ghost px-2 py-1 min-h-0" onClick={() => setQty(l.product_id, l.qty - 1)}>−</button>
                <span className="w-6 text-center">{l.qty}</span>
                <button className="btn-ghost px-2 py-1 min-h-0" onClick={() => setQty(l.product_id, l.qty + 1)}>+</button>
                <span className="w-20 text-right">{formatMoney(l.qty * l.unit_price)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-white/70">Total</span>
          <span className="text-lg font-semibold">{formatMoney(total)}</span>
        </div>

        <label className="block">
          <span className="text-xs text-white/60">Customer (for credit)</span>
          <select
            className="input mt-1"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            disabled={customers.length === 0}
          >
            <option value="">— none —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
            ))}
          </select>
        </label>

        {error && <p className="text-xs text-amber-400">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn" disabled={!cart.length || pending} onClick={() => submit("cash")}>
            {pending ? "…" : "Cash"}
          </button>
          <button
            className="btn-ghost"
            disabled={!cart.length || !customerId || pending}
            onClick={() => submit("credit")}
            title={customerId ? "Charge to customer" : "Pick a customer first"}
          >
            Credit
          </button>
        </div>
      </div>
    </div>
  );
}
