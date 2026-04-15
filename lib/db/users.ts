import { serviceClient } from "./supabase";
import { verifyPin } from "@/lib/auth/pin";
import type { Session } from "@/lib/auth/session";

export async function findUserByName(name: string) {
  const { data, error } = await serviceClient()
    .from("users")
    .select("id, name, role, active, pin_hash")
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function authenticate(name: string, pin: string): Promise<Session | null> {
  const u = await findUserByName(name);
  if (!u || !u.active) return null;
  const ok = await verifyPin(pin, u.pin_hash);
  if (!ok) return null;
  return { userId: u.id, role: u.role, name: u.name };
}
