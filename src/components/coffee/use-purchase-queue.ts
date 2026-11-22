"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncPurchaseAction } from "@/actions/coffee";
import { idbQueueStore } from "@/lib/offline/purchase-queue-db";
import {
  discard as discardRow,
  enqueue,
  retryFailed,
  rowsFor,
  syncQueue,
  type QueueOwner,
  type QueuedPurchase,
  type SendResult,
} from "@/lib/offline/purchase-queue";

/** Sends one queued weighing; a lost login waits like a lost network, so nothing is marked failed by mistake. */
async function send(row: QueuedPurchase): Promise<SendResult> {
  const result = await syncPurchaseAction({
    farmer: row.farmer, grade: row.grade, kg: row.kg, price: row.price, moisture: row.moisture, day: row.day, clientRef: row.clientRef,
  });
  if (result.ok) return { ok: true };
  if (result.error === "not_logged_in") return { ok: false, network: true };
  return { ok: false, network: false, error: result.error };
}

/**
 * The weighings this login has waiting on this phone. Syncs on mount, when the
 * phone comes back online, and after every new row.
 */
export function usePurchaseQueue(owner: QueueOwner) {
  const [rows, setRows] = useState<QueuedPurchase[]>([]);
  const [syncing, setSyncing] = useState(false);
  const running = useRef(false);
  const { userId, tenantId } = owner;

  const refresh = useCallback(async () => {
    try {
      setRows(await rowsFor(idbQueueStore, { userId, tenantId }));
    } catch {
      // IndexedDB unavailable (private mode): the queue is simply empty.
    }
  }, [userId, tenantId]);

  const sync = useCallback(async () => {
    if (running.current || !navigator.onLine) return refresh();
    running.current = true;
    setSyncing(true);
    try {
      await syncQueue(idbQueueStore, { userId, tenantId }, send);
    } catch {
      // Store errors leave the rows where they are for the next try.
    } finally {
      running.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [userId, tenantId, refresh]);

  useEffect(() => {
    void sync();
    const onOnline = () => void sync();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [sync]);

  const add = useCallback(
    async (row: Omit<QueuedPurchase, "status" | "attempts" | "createdAt" | "userId" | "tenantId">) => {
      await enqueue(idbQueueStore, { ...row, userId, tenantId });
      await refresh();
    },
    [userId, tenantId, refresh],
  );

  const retry = useCallback(
    async (clientRef: string) => {
      await retryFailed(idbQueueStore, { userId, tenantId }, clientRef);
      await sync();
    },
    [userId, tenantId, sync],
  );

  const discard = useCallback(
    async (clientRef: string) => {
      await discardRow(idbQueueStore, { userId, tenantId }, clientRef);
      await refresh();
    },
    [userId, tenantId, refresh],
  );

  return { rows, syncing, add, sync, retry, discard };
}
