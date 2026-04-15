import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getOpenShift, openShift } from "@/lib/db/shifts";
import { shiftOpenSchema } from "@/lib/schemas/sale";

async function startAction(formData: FormData) {
  "use server";
  const s = await requireSession();
  const parsed = shiftOpenSchema.safeParse({ opening_cash: formData.get("opening_cash") });
  if (!parsed.success) throw new Error("invalid");
  await openShift(s, parsed.data.opening_cash);
  redirect("/worker");
}

export default async function StartShift() {
  const s = await requireSession();
  const open = await getOpenShift(s);
  if (open) redirect("/worker");

  return (
    <div className="p-4">
      <div className="card">
        <h1 className="text-xl font-semibold mb-3">Start shift</h1>
        <form action={startAction} className="space-y-3">
          <label className="block">
            <span className="text-sm text-white/70">Opening cash</span>
            <input
              name="opening_cash"
              type="number"
              step="0.001"
              min="0"
              defaultValue="0"
              className="input mt-1"
              required
            />
          </label>
          <button className="btn w-full" type="submit">Open shift</button>
        </form>
      </div>
    </div>
  );
}
