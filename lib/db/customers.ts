import { serviceClient, withSession } from "./supabase";
import type { Session } from "@/lib/auth/session";
import type { CustomerInput, PaymentInput } from "@/lib/schemas/customer";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  archived: boolean;
};

export type BalanceRow = CustomerRow & {
  balance: number;
  charged: number;
  paid: number;
  last_sale_at: string | null;
  last_payment_at: string | null;
};

export async function listForPicker(session: Session): Promise<CustomerRow[]> {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const { data, error } = await c
      .from("customers")
      .select("id, name, phone, archived")
      .eq("archived", false)
      .order("name");
    if (error) throw error;
    return (data ?? []) as CustomerRow[];
  });
}

export async function listWithBalances(session: Session): Promise<BalanceRow[]> {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const { data, error } = await c
      .from("customer_balances")
      .select("*")
      .order("name");
    if (error) throw error;
    return (data ?? []) as BalanceRow[];
  });
}

export async function createCustomer(session: Session, input: CustomerInput) {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const { data, error } = await c
      .from("customers")
      .insert({
        name: input.name,
        phone: input.phone || null,
        note: input.note || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  });
}

export async function archiveCustomer(session: Session, id: string) {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const { error } = await c.from("customers").update({ archived: true }).eq("id", id);
    if (error) throw error;
  });
}

export async function recordPayment(session: Session, input: PaymentInput) {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const { data, error } = await c
      .from("customer_payments")
      .insert({
        customer_id: input.customer_id,
        amount: input.amount,
        user_id: session.userId,
        note: input.note ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  });
}
