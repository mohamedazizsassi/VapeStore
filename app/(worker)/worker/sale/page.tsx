import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getOpenShift } from "@/lib/db/shifts";
import { listForWorker } from "@/lib/db/products";
import { listForPicker } from "@/lib/db/customers";
import { SaleScreen } from "./sale-screen";

export default async function SalePage() {
  const s = await requireSession();
  const shift = await getOpenShift(s);
  if (!shift) redirect("/worker/shift/start");
  const [products, customers] = await Promise.all([listForWorker(s), listForPicker(s)]);
  return <SaleScreen shiftId={shift.id} products={products} customers={customers} />;
}
