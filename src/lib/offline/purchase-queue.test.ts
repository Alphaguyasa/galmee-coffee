import { describe, expect, it } from "vitest";
import {
  countOtherLogins,
  discard,
  enqueue,
  retryFailed,
  rowsFor,
  syncQueue,
  type QueuedPurchase,
  type QueueStore,
  type SendResult,
} from "./purchase-queue";

function memoryStore(): QueueStore & { rows: Map<string, QueuedPurchase> } {
  const rows = new Map<string, QueuedPurchase>();
  return {
    rows,
    put: async (row) => void rows.set(row.clientRef, row),
    remove: async (ref) => void rows.delete(ref),
    all: async () => [...rows.values()],
  };
}

const A = { userId: "user-a", tenantId: "tenant-1" };
const B = { userId: "user-b", tenantId: "tenant-1" };

function row(ref: string, owner = A) {
  return { clientRef: ref, ...owner, farmer: "f", farmerName: "F", grade: "g", gradeName: "G", kg: 10, price: 100, moisture: "", day: "2026-11-12" };
}

describe("offline purchase queue", () => {
  it("sends only the signed-in login's rows, oldest first, and removes them", async () => {
    const store = memoryStore();
    await enqueue(store, row("2"), 2);
    await enqueue(store, row("1"), 1);
    await enqueue(store, row("b1", B), 0);
    const seen: string[] = [];
    const summary = await syncQueue(store, A, async (r) => {
      seen.push(r.clientRef);
      return { ok: true };
    });
    expect(seen).toEqual(["1", "2"]);
    expect(summary).toEqual({ sent: 2, failed: 0, waiting: 0 });
    expect([...store.rows.keys()]).toEqual(["b1"]);
    expect(await countOtherLogins(store, A)).toBe(1);
  });

  it("stops on a network failure and keeps the rest in order", async () => {
    const store = memoryStore();
    await enqueue(store, row("1"), 1);
    await enqueue(store, row("2"), 2);
    await enqueue(store, row("3"), 3);
    let calls = 0;
    const summary = await syncQueue(store, A, async (): Promise<SendResult> => (++calls === 2 ? { ok: false, network: true } : { ok: true }));
    expect(summary).toEqual({ sent: 1, failed: 0, waiting: 2 });
    expect(calls).toBe(2);
    const left = await rowsFor(store, A);
    expect(left.map((r) => [r.clientRef, r.status, r.attempts])).toEqual([
      ["2", "pending", 1],
      ["3", "pending", 0],
    ]);
  });

  it("treats a thrown error as offline", async () => {
    const store = memoryStore();
    await enqueue(store, row("1"));
    const summary = await syncQueue(store, A, async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(summary).toEqual({ sent: 0, failed: 0, waiting: 1 });
  });

  it("marks a refused row failed with its reason, skips it next time, and allows a retry", async () => {
    const store = memoryStore();
    await enqueue(store, row("1"), 1);
    await enqueue(store, row("2"), 2);
    const first = await syncQueue(store, A, async (r) => (r.clientRef === "1" ? { ok: false, network: false, error: "farmer_not_found" } : { ok: true }));
    expect(first).toEqual({ sent: 1, failed: 1, waiting: 0 });
    expect(store.rows.get("1")).toMatchObject({ status: "failed", error: "farmer_not_found" });

    let sentAgain = 0;
    await syncQueue(store, A, async () => (sentAgain++, { ok: true }));
    expect(sentAgain).toBe(0);

    await retryFailed(store, A, "1");
    const third = await syncQueue(store, A, async () => ({ ok: true }));
    expect(third).toEqual({ sent: 1, failed: 0, waiting: 0 });
    expect(store.rows.size).toBe(0);
  });

  it("never lets one login retry or discard another login's rows", async () => {
    const store = memoryStore();
    await enqueue(store, row("b1", B));
    await store.put({ ...store.rows.get("b1")!, status: "failed", error: "x" });
    await retryFailed(store, A, "b1");
    await discard(store, A, "b1");
    expect(store.rows.get("b1")).toMatchObject({ status: "failed" });
    await discard(store, B, "b1");
    expect(store.rows.size).toBe(0);
  });
});
