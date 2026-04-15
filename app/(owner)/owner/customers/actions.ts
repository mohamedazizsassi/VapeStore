"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/session";
import { archiveCustomer, createCustomer, recordPayment } from "@/lib/db/customers";
import { customerSchema, paymentSchema } from "@/lib/schemas/customer";

export async function createCustomerAction(form: FormData) {
  const s = await requireOwner();
  const parsed = customerSchema.safeParse({
    name: form.get("name"),
    phone: form.get("phone") ?? "",
    note: form.get("note") ?? "",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "invalid");
  await createCustomer(s, parsed.data);
  revalidatePath("/owner/customers");
}

export async function archiveCustomerAction(id: string) {
  const s = await requireOwner();
  await archiveCustomer(s, id);
  revalidatePath("/owner/customers");
}

export async function recordPaymentAction(customerId: string, form: FormData) {
  const s = await requireOwner();
  const parsed = paymentSchema.safeParse({
    customer_id: customerId,
    amount: form.get("amount"),
    note: form.get("note") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "invalid");
  await recordPayment(s, parsed.data);
  revalidatePath("/owner/customers");
}
