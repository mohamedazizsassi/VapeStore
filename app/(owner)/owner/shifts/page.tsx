import { requireOwner } from "@/lib/auth/session";
import { serviceClient, withSession } from "@/lib/db/supabase";
import { formatMoney } from "@/lib/utils/money";

type ShiftRow = {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  users: { name: string } | null;
};

export default async function ShiftsHistory() {
  const s = await requireOwner();
  const sb = serviceClient();
  const rows = await withSession(sb, s, async (c) => {
    const { data } = await c
      .from("shifts")
      .select("id, opened_at, closed_at, opening_cash, closing_cash, expected_cash, user_id, users(name)")
      .order("opened_at", { ascending: false })
      .limit(50)
      .returns<ShiftRow[]>();
    return data ?? [];
  });

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Shifts</h1>
      <ul className="divide-y divide-white/10">
        {rows.map((r) => {
          const diff =
            r.closing_cash != null && r.expected_cash != null
              ? Number(r.closing_cash) - Number(r.expected_cash)
              : null;
          return (
            <li key={r.id} className="py-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{r.users?.name ?? "—"}</span>
                <span className="text-white/60">{new Date(r.opened_at).toLocaleString()}</span>
              </div>
              <div className="text-xs text-white/60 mt-1">
                open {formatMoney(r.opening_cash)} · expected {r.expected_cash != null ? formatMoney(r.expected_cash) : "—"} · close {r.closing_cash != null ? formatMoney(r.closing_cash) : "open"}
                {diff != null && (
                  <span className={`ml-2 ${diff === 0 ? "text-white/60" : diff > 0 ? "text-green-400" : "text-red-400"}`}>
                    diff {formatMoney(diff)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
        {rows.length === 0 && <li className="text-sm text-white/50 py-4">No shifts yet.</li>}
      </ul>
    </div>
  );
}
