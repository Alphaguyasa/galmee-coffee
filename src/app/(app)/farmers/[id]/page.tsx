import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { recordAdvanceAction, updateFarmerAction, voidEntryAction } from "@/actions/coffee";
import { ActionForm } from "@/components/coffee/action-form";
import { SelectField, selectClass } from "@/components/coffee/fields";
import { Readout } from "@/components/coffee/readout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr, formatKg } from "@/lib/money";
import { getFarmer } from "@/server/dal/coffee";
import { getSession } from "@/server/dal/session";
import { idSchema, METHODS } from "@/server/validation";

export default async function FarmerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await params;
  const id = idSchema.safeParse(idRaw).data;
  if (!id) notFound();
  const locale = (await getLocale()) as Locale;
  const [t, tMethods, data, { profile }] = await Promise.all([getTranslations("statement"), getTranslations("methods"), getFarmer(id), getSession()]);
  if (!data) notFound();
  const { farmer, balance, lines } = data;
  const canManage = profile.role !== "staff";
  const newestFirst = [...lines].reverse();

  return (
    <div className="grid gap-4 print:gap-2">
      <Link href="/farmers" className="inline-flex items-center gap-1 text-sm text-muted-foreground print:hidden"><ChevronLeft className="size-4" aria-hidden />{t("back")}</Link>
      <div>
        <h1 className="text-2xl font-bold">{farmer.name}</h1>
        <p className="num text-sm text-muted-foreground">{t("farmerNo", { no: farmer.no })} · {farmer.kebele}{farmer.phone ? ` · ${farmer.phone}` : ""}{farmer.active ? "" : ` · ${t("inactive")}`}</p>
      </div>

      <Readout label={balance.due < 0 ? t("farmerOwes") : t("paymentDue")} value={formatBirr(Math.abs(balance.due), locale)}>
        {t("formula", { kg: formatKg(balance.kg), bought: formatBirr(balance.bought, locale), advanced: formatBirr(balance.advanced, locale), paid: formatBirr(balance.paid, locale) })}
      </Readout>

      <section className="grid gap-3 rounded-md border bg-card p-3 print:hidden">
        <h2 className="font-semibold">{t("giveMoney")}</h2>
        <ActionForm action={recordAdvanceAction} submitLabel={t("recordMoney")} doneLabel={t("moneyRecorded")} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="farmer" value={farmer.id} />
          <div className="grid gap-2">
            <Label htmlFor="kind">{t("kind")}</Label>
            <select id="kind" name="kind" defaultValue={balance.due > 0 ? "payment" : "advance"} className={selectClass}>
              <option value="payment">{t("kindPayment")}</option>
              <option value="advance">{t("kindAdvance")}</option>
            </select>
          </div>
          <div className="grid gap-2"><Label htmlFor="amount">{t("amount")}</Label><Input id="amount" name="amount" inputMode="decimal" className="num" required /></div>
          <SelectField name="method" label={t("method")} options={METHODS.map((m) => ({ value: m, label: tMethods(m) }))} />
          <div className="grid gap-2"><Label htmlFor="note">{t("note")}</Label><Input id="note" name="note" maxLength={300} /></div>
        </ActionForm>
      </section>

      <section className="grid gap-2">
        <h2 className="font-semibold">{t("lines")}</h2>
        {newestFirst.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y rounded-md border bg-card">
            {newestFirst.map((l) => {
              const title = l.entry === "purchase" ? l.label : t(l.entry === "advance" ? "kindAdvance" : "kindPayment");
              return (
                <li key={l.id} className={`grid gap-1 px-3 py-2 ${l.voided ? "opacity-70" : ""}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`min-w-0 font-semibold ${l.voided ? "line-through" : ""}`}>{title}</span>
                    <span className={`num shrink-0 font-semibold ${l.voided ? "line-through" : ""}`}>
                      {l.entry === "purchase" ? `+${formatBirr(l.credit, locale)}` : `−${formatBirr(l.debit, locale)}`}
                    </span>
                  </div>
                  <div className="num flex items-baseline justify-between gap-2 text-sm text-muted-foreground">
                    <span className="min-w-0">
                      {formatEthiopianDate(l.day, locale)}
                      {l.kg !== null && l.price !== null ? ` · ${formatKg(l.kg)} kg × ${formatBirr(l.price, locale)}` : ""}
                      {l.method ? ` · ${tMethods(l.method)}` : ""}
                      {l.moisture ? ` · ${l.moisture}` : ""}
                      {l.entry !== "purchase" && l.label ? ` · ${l.label}` : ""}
                    </span>
                    <span className="shrink-0">{l.voided ? t("voided") : formatBirr(l.balance, locale)}</span>
                  </div>
                  {l.voided && l.voidReason ? <p className="text-sm">{t("voidedBecause", { reason: l.voidReason })}</p> : null}
                  {canManage && !l.voided ? (
                    <details className="print:hidden">
                      <summary className="cursor-pointer text-sm text-muted-foreground">{t("void")}</summary>
                      <ActionForm action={voidEntryAction} submitLabel={t("voidAction")} doneLabel={t("voidDone")} variant="destructive" className="mt-2 grid gap-2">
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="farmer" value={farmer.id} />
                        <input type="hidden" name="entry" value={l.entry} />
                        <Label htmlFor={`reason-${l.id}`}>{t("voidReason")}</Label>
                        <Input id={`reason-${l.id}`} name="reason" required maxLength={300} />
                      </ActionForm>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canManage ? (
        <details className="rounded-md border bg-card p-3 print:hidden">
          <summary className="cursor-pointer font-semibold">{t("edit")}</summary>
          <ActionForm action={updateFarmerAction} submitLabel={t("save")} doneLabel={t("saved")} className="mt-3 grid gap-3">
            <input type="hidden" name="farmer" value={farmer.id} />
            <div className="grid gap-2"><Label htmlFor="name">{t("name")}</Label><Input id="name" name="name" defaultValue={farmer.name} required maxLength={120} /></div>
            <div className="grid gap-2"><Label htmlFor="kebele">{t("kebele")}</Label><Input id="kebele" name="kebele" defaultValue={farmer.kebele} required maxLength={80} /></div>
            <div className="grid gap-2"><Label htmlFor="phone">{t("phone")}</Label><Input id="phone" name="phone" type="tel" defaultValue={farmer.phone ?? ""} maxLength={20} /></div>
            <SelectField name="active" label={t("status")} defaultValue={String(farmer.active)} options={[{ value: "true", label: t("active") }, { value: "false", label: t("inactive") }]} />
          </ActionForm>
        </details>
      ) : null}
    </div>
  );
}
