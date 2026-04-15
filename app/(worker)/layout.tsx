import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { logoutAction } from "@/app/(auth)/login/actions";
import { SyncBanner } from "./sync-banner";

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-3 border-b border-white/10">
        <Link href="/worker" className="font-semibold">VapeShop</Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/70">{s.name}</span>
          <form action={logoutAction}>
            <button className="text-white/70 underline">Logout</button>
          </form>
        </div>
      </header>
      <SyncBanner />
      <main className="flex-1">{children}</main>
    </div>
  );
}
