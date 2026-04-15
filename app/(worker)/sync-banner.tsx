"use client";

import { useEffect, useState } from "react";
import { countPending, flushPending } from "@/lib/offline/queue";
import { submitSaleAction } from "./worker/sale/actions";

export function SyncBanner() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    countPending().then(setPending);

    async function flush() {
      const sent = await flushPending(async (s) => {
        const res = await submitSaleAction(s);
        return res.ok;
      });
      if (sent > 0) setPending(await countPending());
    }

    const onOnline = () => { setOnline(true); flush(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (navigator.onLine) flush();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online && pending === 0) return null;
  return (
    <div className={`px-3 py-2 text-xs text-center ${online ? "bg-amber-500/20 text-amber-200" : "bg-red-500/20 text-red-200"}`}>
      {online ? `Syncing ${pending} queued sale${pending === 1 ? "" : "s"}…` : `Offline — ${pending} pending`}
    </div>
  );
}
