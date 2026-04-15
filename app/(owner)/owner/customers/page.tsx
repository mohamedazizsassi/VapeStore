import { requireOwner } from "@/lib/auth/session";
import { listWithBalances } from "@/lib/db/customers";
import { formatMoney } from "@/lib/utils/money";
import { archiveCustomerAction, createCustomerAction, recordPaymentAction } from "./actions";

export default async function CustomersPage() {
  const s = await requireOwner();
  const rows = await listWithBalances(s);
  const active = rows.filter((r) => !r.archived);
  const archived = rows.filter((r) => r.archived);
  const totalOwed = active.reduce((a, r) => a + Number(r.balance ?? 0), 0);

  return (
    <div className="p-4 space-y-4">
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Credit customers</h2>
          <div className="text-sm text-white/70">Outstanding: <span className="text-white">{formatMoney(totalOwed)}</span></div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-medium mb-2">Add customer</h3>
        <form action={createCustomerAction} className="space-y-3">
          <input name="name" className="input" placeholder="Name" required maxLength={80} />
          <input name="phone" className="input" placeholder="Phone (optional)" maxLength={40} />
          <input name="note" className="input" placeholder="Note (optional)" maxLength={500} />
          <button className="btn w-full" type="submit">Create</button>
        </form>
      </div>

      <section className="card">
        <h3 className="font-medium mb-2">Active ({active.length})</h3>
        {active.length === 0 ? (
          <p className="text-sm text-white/50">No customers yet.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {active.map((c) => {
              const pay = recordPaymentAction.bind(null, c.id);
              const archive = archiveCustomerAction.bind(null, c.id);
              const bal = Number(c.balance ?? 0);
              return (
                <li key={c.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-white/60">
                        {c.phone ? `${c.phone} · ` : ""}charged {formatMoney(c.charged)} · paid {formatMoney(c.paid)}
                      </div>
                    </div>
                    <div className={`text-right ${bal > 0 ? "text-amber-300" : "text-white/60"}`}>
                      <div className="text-xs text-white/60">Balance</div>
                      <div className="text-lg font-semibold">{formatMoney(bal)}</div>
                    </div>
                  </div>
                  <form action={pay} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input
                      name="amount"
                      type="number"
                      step="0.001"
                      min="0.001"
                      placeholder="Payment"
                      className="input"
                      required
                    />
                    <input name="note" placeholder="Note (optional)" className="input" />
                    <button className="btn" type="submit">Record</button>
                  </form>
                  <form action={archive}>
                    <button className="text-xs text-white/50 underline" type="submit">Archive</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {archived.length > 0 && (
        <section className="card">
          <h3 className="font-medium mb-2 text-white/70">Archived ({archived.length})</h3>
          <ul className="divide-y divide-white/10 text-sm text-white/60">
            {archived.map((c) => (
              <li key={c.id} className="py-2 flex justify-between">
                <span>{c.name}</span>
                <span>balance {formatMoney(c.balance)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
