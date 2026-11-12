import { getLocale, getTranslations } from "next-intl/server";
import { closeLotAction, dispatchLotAction } from "@/actions/coffee";
import { ActionForm } from "@/components/coffee/action-form";
import { Readout } from "@/components/coffee/readout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr, formatKg } from "@/lib/money";
import { listLots, stockByGrade } from "@/server/dal/coffee";
import { getSession } from "@/server/dal/session";

export default async function StockPage() {
  const locale = (await getLocale()) as Locale;
  const [t, stock, lots, { profile }] = await Promise.all([getTranslations("stock"), stockByGrade(), listLots(), getSession()]);
  const canManage = profile.role !== "staff";
  const totalKg = stock.reduce((sum, s) => sum + s.kgOnHand, 0);
  const totalCost = stock.reduce((sum, s) => sum + s.costOnHand, 0);

  return (
    <div className="grid gap-4">
      <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
      <Readout label={t("onHand")} value={formatKg(totalKg)} unit="kg">{t("cost", { amount: formatBirr(totalCost, locale) })}</Readout>

      {stock.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {stock.map((s) => (
            <li key={s.gradeId} className="grid gap-1 rounded-md border bg-card p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate font-semibold">{s.name}</span>
                <span className="num text-xl font-bold whitespace-nowrap">{formatKg(s.kgOnHand)} kg</span>
              </div>
              <p className="num text-sm text-muted-foreground">{t("gradeLine", { amount: formatBirr(s.costOnHand, locale), sent: formatKg(s.kgDispatched) })}</p>
            </li>
          ))}
        </ul>
      )}

      <section className="grid gap-2">
        <h2 className="font-semibold">{t("lots")}</h2>
        {lots.length === 0 ? (
          <p className="text-muted-foreground">{t("noLots")}</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {lots.map((lot) => (
              <li key={lot.id} className="grid gap-2 rounded-md border bg-card p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="num font-bold">{lot.code}</span>
                  <span className="text-sm font-semibold">{t(`status_${lot.status}`)}</span>
                </div>
                <p className="num text-sm">{lot.grade} · {formatKg(lot.kg)} kg · {formatBirr(lot.amount, locale)}</p>
                <p className="num text-sm text-muted-foreground">
                  {t("lotLine", { date: formatEthiopianDate(lot.openedOn, locale), count: lot.purchases })}
                  {lot.dispatchedTo ? ` · ${t("sentTo", { to: lot.dispatchedTo })}` : ""}
                </p>
                {canManage && lot.status !== "dispatched" ? (
                  <div className="grid gap-2">
                    {lot.status === "open" ? (
                      <ActionForm action={closeLotAction} submitLabel={t("close")} variant="outline">
                        <input type="hidden" name="lot" value={lot.id} />
                      </ActionForm>
                    ) : null}
                    {lot.purchases > 0 ? (
                      <details>
                        <summary className="cursor-pointer text-sm font-semibold">{t("dispatch")}</summary>
                        <ActionForm action={dispatchLotAction} submitLabel={t("dispatchAction")} className="mt-2 grid gap-2">
                          <input type="hidden" name="lot" value={lot.id} />
                          <Label htmlFor={`to-${lot.id}`}>{t("buyer")}</Label>
                          <Input id={`to-${lot.id}`} name="to" required maxLength={120} />
                        </ActionForm>
                      </details>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
