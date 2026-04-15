import Link from "next/link";
import { requireOwner } from "@/lib/auth/session";
import { logoutAction } from "@/app/(auth)/login/actions";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const s = await requireOwner();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-3 border-b border-white/10">
        <Link href="/owner" className="font-semibold">VapeShop · Owner</Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/70">{s.name}</span>
          <form action={logoutAction}>
            <button className="text-white/70 underline">Logout</button>
          </form>
        </div>
      </header>
      <nav className="flex gap-1 px-3 py-2 border-b border-white/10 overflow-x-auto text-sm">
        {[
          ["/owner", "Dashboard"],
          ["/owner/products", "Products"],
          ["/owner/restock", "Restock"],
          ["/owner/customers", "Customers"],
          ["/owner/shifts", "Shifts"],
          ["/owner/users", "Users"],
          ["/worker", "Sell"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="px-3 py-2 rounded bg-white/5 whitespace-nowrap">
            {label}
          </Link>
        ))}
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}
