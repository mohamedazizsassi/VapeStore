import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/session";
import { serviceClient, withSession } from "@/lib/db/supabase";
import { hashPin } from "@/lib/auth/pin";

const addSchema = z.object({
  name: z.string().trim().min(1).max(64),
  pin: z.string().regex(/^\d{4,6}$/),
  role: z.enum(["owner", "worker"]),
});

async function addUserAction(form: FormData) {
  "use server";
  const s = await requireOwner();
  const parsed = addSchema.safeParse({
    name: form.get("name"),
    pin: form.get("pin"),
    role: form.get("role"),
  });
  if (!parsed.success) throw new Error("invalid");
  const sb = serviceClient();
  await withSession(sb, s, async (c) => {
    const { error } = await c.from("users").insert({
      name: parsed.data.name,
      pin_hash: await hashPin(parsed.data.pin),
      role: parsed.data.role,
      active: true,
    });
    if (error) throw error;
  });
  revalidatePath("/owner/users");
}

async function toggleActiveAction(id: string, active: boolean) {
  "use server";
  const s = await requireOwner();
  const sb = serviceClient();
  await withSession(sb, s, async (c) => {
    const { error } = await c.from("users").update({ active }).eq("id", id);
    if (error) throw error;
  });
  revalidatePath("/owner/users");
}

export default async function UsersPage() {
  const s = await requireOwner();
  const sb = serviceClient();
  const users = await withSession(sb, s, async (c) => {
    const { data } = await c.from("users").select("id, name, role, active").order("name");
    return data ?? [];
  });

  return (
    <div className="p-4 space-y-4">
      <div className="card">
        <h2 className="font-medium mb-3">Add user</h2>
        <form action={addUserAction} className="space-y-3">
          <input name="name" className="input" placeholder="Name" required />
          <input name="pin" className="input" placeholder="PIN (4-6 digits)" inputMode="numeric" pattern="\d{4,6}" required />
          <select name="role" className="input" defaultValue="worker">
            <option value="worker">worker</option>
            <option value="owner">owner</option>
          </select>
          <button className="btn w-full" type="submit">Create user</button>
        </form>
      </div>

      <div className="card">
        <h2 className="font-medium mb-2">Users</h2>
        <ul className="divide-y divide-white/10">
          {users.map((u) => {
            const toggle = toggleActiveAction.bind(null, u.id, !u.active);
            return (
              <li key={u.id} className="py-2 flex items-center justify-between">
                <div>
                  <div>{u.name} <span className="text-xs text-white/50">({u.role})</span></div>
                  <div className="text-xs text-white/50">{u.active ? "active" : "disabled"}</div>
                </div>
                <form action={toggle}>
                  <button className="btn-ghost px-3 py-2">{u.active ? "Disable" : "Enable"}</button>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
