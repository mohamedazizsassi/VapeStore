import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const name = getArg("--name") ?? process.env.OWNER_NAME;
const pin = getArg("--pin") ?? process.env.OWNER_PIN;

if (!name || !pin) {
  console.error("Usage: pnpm seed:owner -- --name <name> --pin <4-6 digits>");
  process.exit(1);
}
if (!/^\d{4,6}$/.test(pin)) {
  console.error("PIN must be 4-6 digits.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const sb = createClient(url, service, { auth: { persistSession: false } });
const pin_hash = await bcrypt.hash(pin, 10);

const { data: existing, error: selErr } = await sb
  .from("users")
  .select("id, role, active")
  .eq("name", name)
  .maybeSingle();
if (selErr) {
  console.error("Select failed:", selErr.message);
  process.exit(1);
}

if (existing) {
  const { error } = await sb
    .from("users")
    .update({ pin_hash, role: "owner", active: true })
    .eq("id", existing.id);
  if (error) {
    console.error("Update failed:", error.message);
    process.exit(1);
  }
  console.log(`Updated existing user "${name}" as owner (id=${existing.id}).`);
} else {
  const { data, error } = await sb
    .from("users")
    .insert({ name, pin_hash, role: "owner", active: true })
    .select("id")
    .single();
  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }
  console.log(`Created owner "${name}" (id=${data.id}).`);
}
