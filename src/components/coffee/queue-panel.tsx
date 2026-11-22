"use client";

import { useLocale, useTranslations } from "next-intl";
import { SyncStatus } from "@/components/galmee/sync-status";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import type { QueuedPurchase } from "@/lib/offline/purchase-queue";
import { formatBirr, formatKg, previewAmount } from "@/lib/money";

/** Weighings kept on this phone: the waiting count, and each refused one with retry or discard. */
export function QueuePanel({
  rows,
  syncing,
  onRetry,
  onDiscard,
}: {
  rows: QueuedPurchase[];
  syncing: boolean;
  onRetry: (clientRef: string) => void;
  onDiscard: (clientRef: string) => void;
}) {
  const t = useTranslations("queue");
  const tErrors = useTranslations("errors");
  const locale = useLocale() as Locale;
  const waiting = rows.filter((r) => r.status === "pending");
  const failed = rows.filter((r) => r.status === "failed");
  if (rows.length === 0) return null;

  return (
    <section aria-live="polite" className="grid gap-2 rounded-md border bg-card p-3">
      <div className="flex flex-wrap gap-2">
        {waiting.length ? (
          <SyncStatus state={syncing ? "syncing" : "queued"} label={t(syncing ? "syncing" : "waiting", { count: waiting.length })} />
        ) : null}
        {failed.length ? <SyncStatus state="failed" label={t("failed", { count: failed.length })} /> : null}
      </div>
      {waiting.length && !syncing ? <p className="text-sm text-muted-foreground">{t("waitingHint")}</p> : null}
      {failed.length ? (
        <ul className="grid gap-2">
          {failed.map((r) => (
            <li key={r.clientRef} className="grid gap-2 rounded-md border border-destructive/40 p-2">
              <p className="font-semibold">{r.farmerName}</p>
              <p className="num text-sm text-muted-foreground">
                {formatKg(r.kg)} kg · {r.gradeName} · {formatBirr(previewAmount(r.kg, r.price), locale)}
              </p>
              <p className="text-sm text-destructive">{tErrors(r.error ?? "generic")}</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onRetry(r.clientRef)}>{t("retry")}</Button>
                <Button type="button" variant="destructive" onClick={() => onDiscard(r.clientRef)}>{t("discard")}</Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
