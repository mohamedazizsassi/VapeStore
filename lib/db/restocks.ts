import { serviceClient, withSession } from "./supabase";
import type { Session } from "@/lib/auth/session";
import type { RestockInput } from "@/lib/schemas/product";

export async function recordRestock(session: Session, input: RestockInput) {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const { data, error } = await c
      .from("restocks")
      .insert({ ...input, user_id: session.userId })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  });
}
