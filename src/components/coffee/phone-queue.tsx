"use client";

import { QueuePanel } from "@/components/coffee/queue-panel";
import { usePurchaseQueue } from "@/components/coffee/use-purchase-queue";
import type { QueueOwner } from "@/lib/offline/purchase-queue";

/** This login's weighings still on the phone, for screens other than Buy. Renders nothing when the queue is empty. */
export function PhoneQueue({ owner }: { owner: QueueOwner }) {
  const queue = usePurchaseQueue(owner);
  return <QueuePanel rows={queue.rows} syncing={queue.syncing} onRetry={(ref) => void queue.retry(ref)} onDiscard={(ref) => void queue.discard(ref)} />;
}
