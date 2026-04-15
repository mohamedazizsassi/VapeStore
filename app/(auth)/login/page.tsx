import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const s = await readSession();
  if (s) redirect(s.role === "owner" ? "/owner" : "/worker");
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm card">
        <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
        <LoginForm />
      </div>
    </main>
  );
}
