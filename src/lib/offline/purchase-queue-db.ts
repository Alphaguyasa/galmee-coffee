"use client";

import Dexie, { type EntityTable } from "dexie";
import type { QueuedPurchase, QueueStore } from "./purchase-queue";

class QueueDb extends Dexie {
  purchases!: EntityTable<QueuedPurchase, "clientRef">;
  constructor() {
    super("galmee-coffee-queue");
    this.version(1).stores({ purchases: "clientRef, createdAt, [userId+tenantId]" });
  }
}

let db: QueueDb | null = null;
function open() {
  db ??= new QueueDb();
  return db;
}

/** The weighing queue in IndexedDB on this phone. */
export const idbQueueStore: QueueStore = {
  put: async (row) => void (await open().purchases.put(row)),
  remove: async (ref) => void (await open().purchases.delete(ref)),
  all: () => open().purchases.toArray(),
};

/** Wipes the queue (logout after the clerk confirmed losing unsent rows). */
export async function clearQueue() {
  await open().purchases.clear();
}
