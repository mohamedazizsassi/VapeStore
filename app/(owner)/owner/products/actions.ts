"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth/session";
import { createProduct, updateProduct, archiveProduct } from "@/lib/db/products";
import { productSchema } from "@/lib/schemas/product";

function parse(form: FormData) {
  const parsed = productSchema.safeParse({
    name: form.get("name"),
    cost_price: form.get("cost_price"),
    sell_price: form.get("sell_price"),
    low_stock_threshold: form.get("low_stock_threshold") || 5,
    photo_url: form.get("photo_url") || null,
    barcode: form.get("barcode") || null,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "invalid");
  return parsed.data;
}

export async function createProductAction(form: FormData) {
  const s = await requireOwner();
  const data = parse(form);
  await createProduct(s, data);
  redirect("/owner/products");
}

export async function updateProductAction(id: string, form: FormData) {
  const s = await requireOwner();
  const data = parse(form);
  await updateProduct(s, id, data);
  redirect("/owner/products");
}

export async function archiveProductAction(id: string) {
  const s = await requireOwner();
  await archiveProduct(s, id);
  redirect("/owner/products");
}
