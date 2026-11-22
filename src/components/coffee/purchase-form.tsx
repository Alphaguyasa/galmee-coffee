"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, CloudOff, Search } from "lucide-react";
import { recordPurchaseAction, type ActionState } from "@/actions/coffee";
import { QueuePanel } from "@/components/coffee/queue-panel";
import { usePurchaseQueue } from "@/components/coffee/use-purchase-queue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import { addisToday } from "@/lib/day";
import { formatBirr, formatKg, previewAmount } from "@/lib/money";
import type { QueueOwner } from "@/lib/offline/purchase-queue";
import { cn } from "@/lib/utils";

export type FarmerOption = { id: string; no: number; name: string; kebele: string; phone: string | null };
export type GradeOption = { id: string; code: string; name: string; defaultPrice: number };

const MAX_RESULTS = 6;

export function PurchaseForm({ farmers, grades, owner }: { farmers: FarmerOption[]; grades: GradeOption[]; owner: QueueOwner }) {
  const t = useTranslations("buy");
  const tErrors = useTranslations("errors");
  const locale = useLocale() as Locale;
  const queue = usePurchaseQueue(owner);
  const formRef = useRef<HTMLFormElement>(null);
  const [queued, setQueued] = useState<{ name: string; kg: number } | null>(null);
  // One reference per weighing: a double tap, a retry or a later sync cannot record it twice.
  const [clientRef, setClientRef] = useState(() => crypto.randomUUID());
  const [query, setQuery] = useState("");
  const [farmer, setFarmer] = useState<FarmerOption | null>(null);
  const [grade, setGrade] = useState<GradeOption | null>(grades.length === 1 ? grades[0] : null);
  const [kg, setKg] = useState("");
  const [price, setPrice] = useState(grades.length === 1 ? String(grades[0].defaultPrice) : "");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return farmers
      .filter((f) => f.name.toLowerCase().includes(q) || f.kebele.toLowerCase().includes(q) || f.phone?.includes(q) || String(f.no) === q)
      .slice(0, MAX_RESULTS);
  }, [farmers, query]);

  /** Offline (or the request never reached the server): keep the weighing on the phone and start a fresh form. */
  async function keepOnPhone(formData: FormData): Promise<ActionState> {
    if (!farmer || !grade) return { error: "form" };
    const weighed = Number(formData.get("kg"));
    await queue.add({
      clientRef, farmer: farmer.id, farmerName: farmer.name, grade: grade.id, gradeName: grade.name,
      kg: weighed, price: Number(formData.get("price")), moisture: String(formData.get("moisture") ?? ""), day: addisToday(),
    });
    setQueued({ name: farmer.name, kg: weighed });
    setClientRef(crypto.randomUUID());
    setFarmer(null);
    setQuery("");
    setKg("");
    formRef.current?.reset();
    return undefined;
  }

  async function submit(prev: ActionState, formData: FormData): Promise<ActionState> {
    setQueued(null);
    if (!navigator.onLine) return keepOnPhone(formData);
    try {
      return await recordPurchaseAction(prev, formData);
    } catch (error) {
      // A failed fetch is a TypeError; anything else (including the redirect after saving) is passed on.
      if (error instanceof TypeError) return keepOnPhone(formData);
      throw error;
    }
  }

  const [state, formAction, pending] = useActionState(submit, undefined);

  const kgValue = Number(kg);
  const priceValue = Number(price);
  const ready = farmer && grade && kgValue > 0 && priceValue > 0;

  return (
    <div className="grid gap-4">
      <QueuePanel rows={queue.rows} syncing={queue.syncing} onRetry={(ref) => void queue.retry(ref)} onDiscard={(ref) => void queue.discard(ref)} />
      {queued ? (
        <p role="status" className="flex items-start gap-2 rounded-md border border-primary bg-accent p-3 font-semibold">
          <CloudOff className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <span className="num">{t("queued", { name: queued.name, kg: formatKg(queued.kg) })}</span>
        </p>
      ) : null}
      <form ref={formRef} action={formAction} className="grid gap-5 md:grid-cols-2 md:items-start">
        <input type="hidden" name="clientRef" value={clientRef} />
        <input type="hidden" name="farmer" value={farmer?.id ?? ""} />
        <input type="hidden" name="grade" value={grade?.id ?? ""} />

        <div className="grid gap-5">
          <fieldset className="grid gap-2">
            <legend className="mb-2 font-semibold">{t("farmer")}</legend>
            {farmer ? (
              <div className="flex items-center justify-between gap-2 rounded-md border bg-card p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{farmer.name}</p>
                  <p className="num truncate text-sm text-muted-foreground">No. {farmer.no} · {farmer.kebele}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => { setFarmer(null); setQuery(""); }}>{t("change")}</Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    aria-label={t("searchFarmer")}
                    placeholder={t("searchFarmer")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
                {query.trim() && results.length === 0 ? <p className="text-sm text-muted-foreground">{t("noFarmer")}</p> : null}
                {results.length ? (
                  <ul className="grid gap-1">
                    {results.map((f) => (
                      <li key={f.id}>
                        <button type="button" onClick={() => setFarmer(f)} className="flex min-h-12 w-full items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-left hover:bg-accent">
                          <span className="min-w-0 truncate font-medium">{f.name}</span>
                          <span className="num shrink-0 text-sm text-muted-foreground">{f.kebele} · {f.no}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-2 font-semibold">{t("grade")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {grades.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={grade?.id === g.id}
                  onClick={() => { setGrade(g); setPrice(String(g.defaultPrice)); }}
                  className={cn("flex min-h-14 items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-left", grade?.id === g.id && "border-primary bg-accent font-semibold")}
                >
                  <span className="min-w-0 break-words">{g.name}</span>
                  {grade?.id === g.id ? <Check className="size-4 shrink-0 text-primary" aria-hidden /> : <span className="num shrink-0 text-sm text-muted-foreground">{g.code}</span>}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="kg">{t("kg")}</Label>
              <Input id="kg" name="kg" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} className="num text-lg" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">{t("price")}</Label>
              <Input id="price" name="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="num text-lg" required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="moisture">{t("moisture")}</Label>
            <Input id="moisture" name="moisture" maxLength={120} placeholder={t("moistureHint")} />
          </div>
          <div className="rounded-md bg-readout p-4 text-readout-foreground" aria-live="polite">
            <p className="text-sm">{t("amount")}</p>
            <p className="num text-3xl font-bold">{ready ? formatBirr(previewAmount(kgValue, priceValue), locale) : "—"}</p>
          </div>
          {state?.error ? <p role="alert" className="text-sm text-destructive">{tErrors(state.error)}</p> : null}
          <Button type="submit" size="lg" disabled={!ready || pending} aria-busy={pending}>{t("record")}</Button>
        </div>
      </form>
    </div>
  );
}
