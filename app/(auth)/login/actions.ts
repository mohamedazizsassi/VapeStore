"use server";

import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/schemas/auth";
import { authenticate } from "@/lib/db/users";
import { issueSession, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    name: form.get("name"),
    pin: form.get("pin"),
  });
  if (!parsed.success) return { error: "Invalid name or PIN" };

  const session = await authenticate(parsed.data.name, parsed.data.pin);
  if (!session) return { error: "Wrong name or PIN" };

  const token = await issueSession(session);
  await setSessionCookie(token);
  redirect(session.role === "owner" ? "/owner" : "/worker");
}

export async function logoutAction(): Promise<void> {
  clearSessionCookie();
  redirect("/login");
}
