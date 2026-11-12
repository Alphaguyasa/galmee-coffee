/**
 * Offline queue for weighings: the sync rules, kept free of IndexedDB so they
 * can be tested. The Dexie store implements `QueueStore`.
 *
 * Rules:
 * - Every row carries the user and tenant it was weighed under. A shared phone
 *   only ever sends the rows of the login that is signed in now.
 * - Rows go oldest first. `client_ref` makes a resend safe: the server returns
 *   the weighing already recorded instead of a second one.
 * - A network failure stops the run and keeps the row for the next try.
 *   A refusal from the server (farmer removed, bad figure) marks the row failed
 *   with its reason so the clerk can see it; it is never retried silently.
 */

export type QueuedPurchase = {
  clientRef: string;
  userId: string;
  tenantId: string;
  farmer: string;
  farmerName: string;
  grade: string;
  gradeName: string;
  kg: number;
  price: number;
  moisture: string;
  /** Addis Ababa calendar day the coffee was weighed (YYYY-MM-DD). */
  day: string;
  createdAt: number;
  status: "pending" | "failed";
  attempts: number;
  error?: string;
};

export type QueueOwner = { userId: string; tenantId: string };

export interface QueueStore {
  put(row: QueuedPurchase): Promise<void>;
  remove(clientRef: string): Promise<void>;
  /** All rows, any owner. */
  all(): Promise<QueuedPurchase[]>;
}

export type SendResult = { ok: true } | { ok: false; network: true } | { ok: false; network: false; error: string };

export type SyncSummary = { sent: number; failed: number; waiting: number };

export function belongsTo(row: QueuedPurchase, owner: QueueOwner) {
  return row.userId === owner.userId && row.tenantId === owner.tenantId;
}

/** Rows of this login, oldest first. */
export async function rowsFor(store: QueueStore, owner: QueueOwner) {
  const rows = await store.all();
  return rows.filter((r) => belongsTo(r, owner)).sort((a, b) => a.createdAt - b.createdAt);
}

/** Rows weighed under another login on this phone; they wait for that login. */
export async function countOtherLogins(store: QueueStore, owner: QueueOwner) {
  const rows = await store.all();
  return rows.filter((r) => !belongsTo(r, owner)).length;
}

export async function enqueue(store: QueueStore, row: Omit<QueuedPurchase, "status" | "attempts" | "createdAt">, now = Date.now()) {
  await store.put({ ...row, status: "pending", attempts: 0, createdAt: now });
}

/** Sends this login's pending rows in order. Failed rows stay until a clerk retries or discards them. */
export async function syncQueue(store: QueueStore, owner: QueueOwner, send: (row: QueuedPurchase) => Promise<SendResult>): Promise<SyncSummary> {
  const rows = await rowsFor(store, owner);
  let sent = 0;
  let failed = rows.filter((r) => r.status === "failed").length;
  const pending = rows.filter((r) => r.status === "pending");

  for (let i = 0; i < pending.length; i++) {
    const row = pending[i];
    let result: SendResult;
    try {
      result = await send(row);
    } catch {
      result = { ok: false, network: true };
    }
    if (result.ok) {
      await store.remove(row.clientRef);
      sent++;
    } else if (result.network) {
      await store.put({ ...row, attempts: row.attempts + 1 });
      return { sent, failed, waiting: pending.length - i };
    } else {
      await store.put({ ...row, status: "failed", attempts: row.attempts + 1, error: result.error });
      failed++;
    }
  }
  return { sent, failed, waiting: 0 };
}

/** Puts a failed row back in line (after the clerk fixed the cause, e.g. re-activated the farmer). */
export async function retryFailed(store: QueueStore, owner: QueueOwner, clientRef: string) {
  const row = (await rowsFor(store, owner)).find((r) => r.clientRef === clientRef);
  if (row && row.status === "failed") await store.put({ ...row, status: "pending", error: undefined });
}

/** Removes a row of this login only; another login's rows can never be discarded from here. */
export async function discard(store: QueueStore, owner: QueueOwner, clientRef: string) {
  const row = (await rowsFor(store, owner)).find((r) => r.clientRef === clientRef);
  if (row) await store.remove(clientRef);
}
