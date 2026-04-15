import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { getOpenShift, shiftSummary } from "@/lib/db/shifts";
import { formatMoney } from "@/lib/utils/money";

export default async function WorkerHome() {
  const s = await requireSession();
  const shift = await getOpenShift(s);
  if (!shift) redirect("/worker/shift/start");

  const sum = await shiftSummary(s, shift.id);
  return (
    <div className="p-4 space-y-4">
      <section className="card">
        <h2 className="text-sm text-white/70">Current shift</h2>
        <p className="mt-1">Opened {new Date(shift.opened_at).toLocaleTimeString()}</p>
        <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
          <div><div className="text-white/60">Sales</div><div className="text-lg">{sum.count}</div></div>
          <div><div className="text-white/60">Cash</div><div className="text-lg">{formatMoney(sum.cashTotal)}</div></div>
          <div><div className="text-white/60">Total</div><div className="text-lg">{formatMoney(sum.total)}</div></div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/worker/sale" className="btn">New sale</Link>
        <Link href="/worker/shift/end" className="btn-ghost">End shift</Link>
      </div>
    </div>
  );
}
