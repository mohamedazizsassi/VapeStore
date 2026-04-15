import { serviceClient, withSession } from "./supabase";
import type { Session } from "@/lib/auth/session";

export type Shift = {
  id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  note: string | null;
};

export async function getOpenShift(session: Session): Promise<Shift | null> {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const { data, error } = await c
      .from("shifts")
      .select("*")
      .eq("user_id", session.userId)
      .is("closed_at", null)
      .maybeSingle();
    if (error) throw error;
    return (data as Shift) ?? null;
  });
}

export async function openShift(session: Session, openingCash: number): Promise<Shift> {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const { data, error } = await c
      .from("shifts")
      .insert({ user_id: session.userId, opening_cash: openingCash })
      .select("*")
      .single();
    if (error) throw error;
    return data as Shift;
  });
}

export async function closeShift(
  session: Session,
  shiftId: string,
  closingCash: number,
  note?: string,
): Promise<Shift> {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const { data: sums } = await c
      .from("sales")
      .select("total, payment_method")
      .eq("shift_id", shiftId);
    const cashSales = (sums ?? [])
      .filter((r) => r.payment_method === "cash")
      .reduce((acc, r) => acc + Number(r.total), 0);

    const { data: shift } = await c
      .from("shifts")
      .select("opening_cash")
      .eq("id", shiftId)
      .single();
    const expected = Number(shift?.opening_cash ?? 0) + cashSales;

    const { data, error } = await c
      .from("shifts")
      .update({
        closed_at: new Date().toISOString(),
        closing_cash: closingCash,
        expected_cash: expected,
        note: note ?? null,
      })
      .eq("id", shiftId)
      .select("*")
      .single();
    if (error) throw error;
    return data as Shift;
  });
}

export async function shiftSummary(session: Session, shiftId: string) {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const { data, error } = await c
      .from("sales")
      .select("total, payment_method")
      .eq("shift_id", shiftId);
    if (error) throw error;
    const rows = data ?? [];
    const count = rows.length;
    const cashTotal = rows.filter((r) => r.payment_method === "cash").reduce((a, r) => a + Number(r.total), 0);
    const total = rows.reduce((a, r) => a + Number(r.total), 0);
    return { count, cashTotal, total };
  });
}
