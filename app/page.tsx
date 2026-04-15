import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";

export default async function Home() {
  const s = await readSession();
  if (!s) redirect("/login");
  redirect(s.role === "owner" ? "/owner" : "/worker");
}
