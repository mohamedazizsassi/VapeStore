"use client";

import { openDB, type IDBPDatabase } from "idb";
import { v4 as uuid } from "uuid";
import type { SaleInput } from "@/lib/schemas/sale";

const DB_NAME = "vapeshop";
const STORE = "pending_sales";

type PendingSale = SaleInput & { queued_at: number };

let dbp: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  if (!dbp) {
    dbp = openDB(DB_NAME, 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: "client_id" });
        }
      },
    });
  }
  return dbp;
}

export async function enqueueSale(sale: Omit<SaleInput, "client_id"> & { client_id?: string }): Promise<string> {
  const d = await db();
  const entry: PendingSale = { ...sale, client_id: sale.client_id ?? uuid(), queued_at: Date.now() };
  await d.put(STORE, entry);
  return entry.client_id;
}

export async function listPending(): Promise<PendingSale[]> {
  const d = await db();
  return (await d.getAll(STORE)) as PendingSale[];
}

export async function countPending(): Promise<number> {
  const d = await db();
  return d.count(STORE);
}

export async function removePending(clientId: string): Promise<void> {
  const d = await db();
  await d.delete(STORE, clientId);
}

export async function flushPending(post: (s: PendingSale) => Promise<boolean>): Promise<number> {
  const pending = await listPending();
  let sent = 0;
  for (const s of pending) {
    try {
      const ok = await post(s);
      if (ok) { await removePending(s.client_id); sent++; }
    } catch {
      break;
    }
  }
  return sent;
}
