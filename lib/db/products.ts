import { serviceClient, withSession } from "./supabase";
import type { Session } from "@/lib/auth/session";
import type { ProductInput } from "@/lib/schemas/product";

export type ProductForWorker = {
  id: string;
  name: string;
  category_id: string | null;
  sell_price: number;
  stock: number;
  low_stock_threshold: number;
  photo_url: string | null;
  barcode: string | null;
  archived: boolean;
};

export async function listForWorker(session: Session): Promise<ProductForWorker[]> {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const { data, error } = await c
      .from("products_public")
      .select("id, name, category_id, sell_price, stock, low_stock_threshold, photo_url, barcode, archived")
      .eq("archived", false)
      .order("name");
    if (error) throw error;
    return (data ?? []) as ProductForWorker[];
  });
}

export async function listForOwner(session: Session) {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const { data, error } = await c
      .from("products")
      .select("*")
      .order("name");
    if (error) throw error;
    return data ?? [];
  });
}

export async function createProduct(session: Session, input: ProductInput) {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const { data, error } = await c.from("products").insert(input).select("*").single();
    if (error) throw error;
    return data;
  });
}

export async function updateProduct(session: Session, id: string, input: Partial<ProductInput>) {
  const sb = serviceClient();
  return withSession(sb, session, async (c) => {
    const { data, error } = await c.from("products").update(input).eq("id", id).select("*").single();
    if (error) throw error;
    return data;
  });
}

export async function archiveProduct(session: Session, id: string) {
  return updateProduct(session, id, { archived: true } as Partial<ProductInput>);
}
