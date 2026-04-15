import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function browserClient(): SupabaseClient {
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

export function serviceClient(): SupabaseClient {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(url, service, { auth: { persistSession: false } });
}

export async function withSession<T>(
  client: SupabaseClient,
  ctx: { userId: string; role: "owner" | "worker" },
  fn: (c: SupabaseClient) => Promise<T>,
): Promise<T> {
  const { error } = await client.rpc("app_set_session", { uid: ctx.userId, urole: ctx.role });
  if (error) throw error;
  return fn(client);
}
