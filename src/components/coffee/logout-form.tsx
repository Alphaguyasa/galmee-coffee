"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { logout } from "@/actions/auth";
import { idbQueueStore } from "@/lib/offline/purchase-queue-db";
import { discard, rowsFor, type QueueOwner } from "@/lib/offline/purchase-queue";

/**
 * Logout that protects the phone's queue: if this login still has weighings that
 * were not sent, the clerk must confirm losing them. On logout this login's rows
 * are removed, so the next person on a shared phone never sees them; other
 * logins' rows stay for those logins.
 */
export function LogoutForm({ owner, children }: { owner: QueueOwner; children: React.ReactNode }) {
  const t = useTranslations("queue");
  const checked = useRef(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Second pass, after the check below: let the logout action run.
    if (checked.current) return;
    const form = event.currentTarget;
    event.preventDefault();
    let rows: Awaited<ReturnType<typeof rowsFor>> = [];
    try {
      rows = await rowsFor(idbQueueStore, owner);
    } catch {
      // No IndexedDB on this browser: nothing can be waiting.
    }
    if (rows.length > 0 && !window.confirm(t("logoutUnsent", { count: rows.length }))) return;
    try {
      for (const row of rows) await discard(idbQueueStore, owner, row.clientRef);
    } catch {
      // The rows stay tagged with this login and are never sent under another one.
    }
    checked.current = true;
    form.requestSubmit();
  }

  return (
    <form action={logout} onSubmit={(e) => void onSubmit(e)}>
      {children}
    </form>
  );
}
