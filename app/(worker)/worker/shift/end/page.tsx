import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { closeShift, getOpenShift, shiftSummary } from "@/lib/db/shifts";
import { shiftCloseSchema } from "@/lib/schemas/sale";
import { formatMoney } from "@/lib/utils/money";

async function endAction(formData: FormData) {
  "use server";
  const s = await requireSession();
  const open = await getOpenShift(s);
  if (!open) redirect("/worker");
  const parsed = shiftCloseSchema.safeParse({
    closing_cash: formData.get("closing_cash"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) throw new Error("invalid");
  await closeShift(s, open.id, parsed.data.closing_cash, parsed.data.note);
  redirect("/login");
}

export default async function EndShift() {
  const s = await requireSession();
  const open = await getOpenShift(s);
  if (!open) redirect("/worker");
  const sum = await shiftSummary(s, open.id);
  const expected = Number(open.opening_cash) + sum.cashTotal;

  return (
    <div className="p-4">
      <div className="card">
        <h1 className="text-xl font-semibold mb-3">End shift</h1>
        <p className="text-sm text-white/70">Expected cash in drawer: <span className="text-white">{formatMoney(expected)}</span></p>
        <form action={endAction} className="space-y-3 mt-3">
          <label className="block">
            <span className="text-sm text-white/70">Closing cash</span>
            <input name="closing_cash" type="number" step="0.001" min="0" className="input mt-1" required />
          </label>
          <label className="block">
            <span className="text-sm text-white/70">Note (optional)</span>
            <input name="note" type="text" className="input mt-1" />
          </label>
          <button className="btn w-full" type="submit">Close shift & logout</button>
        </form>
      </div>
    </div>
  );
}
